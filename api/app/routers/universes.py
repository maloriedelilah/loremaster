"""
Loremaster — Universes Router
Authors manage their lore universes.
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models import Universe, Workspace, User
from ..schemas.universe import (
    UniverseCreate, UniverseUpdate, UniverseResponse,
    WorkspaceCreate, WorkspaceUpdate, WorkspaceResponse,
)
from ..services.auth import require_author
from ..services.anythingllm import anythingllm, generate_workspace_slug

router = APIRouter(prefix="/universes", tags=["universes"])


# ── Universes ────────────────────────────────────────────────────────────────

@router.get("", response_model=list[UniverseResponse])
async def list_universes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_author),
):
    result = await db.execute(
        select(Universe)
        .where(Universe.tenant_id == current_user.tenant_id, Universe.active == True)
        .order_by(Universe.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=UniverseResponse)
async def create_universe(
    data: UniverseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_author),
):
    universe = Universe(
        id=str(uuid.uuid4()),
        tenant_id=current_user.tenant_id,
        name=data.name,
        description=data.description,
        default_prompt=data.default_prompt,
        active=True,
    )
    db.add(universe)
    await db.commit()
    await db.refresh(universe)
    return universe


@router.get("/{universe_id}", response_model=UniverseResponse)
async def get_universe(
    universe_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_author),
):
    universe = await db.get(Universe, universe_id)
    if not universe or universe.tenant_id != current_user.tenant_id or not universe.active:
        raise HTTPException(status_code=404, detail="Universe not found")
    return universe


@router.patch("/{universe_id}", response_model=UniverseResponse)
async def update_universe(
    universe_id: str,
    data: UniverseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_author),
):
    universe = await db.get(Universe, universe_id)
    if not universe or universe.tenant_id != current_user.tenant_id or not universe.active:
        raise HTTPException(status_code=404, detail="Universe not found")

    if data.name is not None:
        universe.name = data.name
    if data.description is not None:
        universe.description = data.description
    if data.default_prompt is not None:
        universe.default_prompt = data.default_prompt
    if data.default_workspace is not None:
        universe.default_workspace = data.default_workspace
    if data.active is not None:
        universe.active = data.active

    await db.commit()
    await db.refresh(universe)
    return universe


# ── Workspaces ───────────────────────────────────────────────────────────────

@router.get("/{universe_id}/workspaces", response_model=list[WorkspaceResponse])
async def list_workspaces(
    universe_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_author),
):
    universe = await db.get(Universe, universe_id)
    if not universe or universe.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Universe not found")

    result = await db.execute(
        select(Workspace)
        .where(Workspace.universe_id == universe_id, Workspace.active == True)
        .order_by(Workspace.created_at.asc())
    )
    return result.scalars().all()


@router.post("/{universe_id}/workspaces", response_model=WorkspaceResponse)
async def create_workspace(
    universe_id: str,
    data: WorkspaceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_author),
):
    universe = await db.get(Universe, universe_id)
    if not universe or universe.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Universe not found")

    # Generate hex ID — becomes the prefix in AnythingLLM name and start of slug
    hex_id = generate_workspace_slug()

    # Create workspace in AnythingLLM with prefixed name for unique slug
    atllm_workspace = await anythingllm.create_workspace(
        hex_id=hex_id,
        tenant_id=current_user.tenant_id,
        universe_name=universe.name,
        workspace_name=data.name,
    )
    if not atllm_workspace:
        raise HTTPException(
            status_code=502,
            detail="Failed to create workspace in AnythingLLM. Check that AnythingLLM is reachable."
        )

    actual_slug = atllm_workspace.get("slug")

    # Determine effective prompt and apply all settings
    effective_prompt = data.prompt or universe.default_prompt
    await anythingllm.update_workspace_settings(
        slug=actual_slug,
        prompt=effective_prompt,
        context_snippets=data.context_snippets,
        chat_mode="query",
    )

    workspace = Workspace(
        id=str(uuid.uuid4()),
        universe_id=universe_id,
        tenant_id=current_user.tenant_id,
        name=data.name,
        slug=actual_slug,
        prompt=data.prompt,
        context_snippets=data.context_snippets,
        active=True,
    )
    db.add(workspace)
    await db.commit()
    await db.refresh(workspace)
    return workspace


@router.patch("/{universe_id}/workspaces/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(
    universe_id: str,
    workspace_id: str,
    data: WorkspaceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_author),
):
    workspace = await db.get(Workspace, workspace_id)
    if not workspace or workspace.tenant_id != current_user.tenant_id or not workspace.active:
        raise HTTPException(status_code=404, detail="Workspace not found")

    universe = await db.get(Universe, workspace.universe_id)

    # Extract hex ID from existing slug (first 8 chars)
    hex_id = workspace.slug[:8]
    new_name = data.name if data.name is not None else workspace.name

    # Sync display name to AnythingLLM keeping hex prefix
    await anythingllm.update_workspace(
        slug=workspace.slug,
        hex_id=hex_id,
        tenant_id=current_user.tenant_id,
        universe_name=universe.name,
        workspace_name=new_name,
    )

    # Sync settings
    new_prompt = data.prompt if data.prompt is not None else workspace.prompt
    new_snippets = data.context_snippets if data.context_snippets is not None else workspace.context_snippets
    effective_prompt = new_prompt or universe.default_prompt
    await anythingllm.update_workspace_settings(
        slug=workspace.slug,
        prompt=effective_prompt,
        context_snippets=new_snippets,
        chat_mode="query",
    )

    if data.name is not None:
        workspace.name = data.name
    if data.prompt is not None:
        workspace.prompt = data.prompt
    if data.context_snippets is not None:
        workspace.context_snippets = data.context_snippets
    if data.active is not None:
        workspace.active = data.active

    await db.commit()
    await db.refresh(workspace)
    return workspace


@router.delete("/{universe_id}/workspaces/{workspace_id}")
async def delete_workspace(
    universe_id: str,
    workspace_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_author),
):
    workspace = await db.get(Workspace, workspace_id)
    if not workspace or workspace.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Workspace not found")

    deleted = await anythingllm.delete_workspace(workspace.slug)
    if not deleted:
        raise HTTPException(
            status_code=502,
            detail="Failed to delete workspace in AnythingLLM. Check that AnythingLLM is reachable."
        )

    workspace.active = False
    await db.commit()
    return {"status": "deactivated", "id": workspace_id}