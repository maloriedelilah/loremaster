"""
Loremaster — Tenants Router
Superadmin CRUD for tenants.
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models import Tenant, User, UserRole
from ..schemas.tenant import TenantCreate, TenantUpdate, TenantResponse
from ..services.auth import require_superadmin

router = APIRouter(prefix="/admin/tenants", tags=["admin"])


@router.get("", response_model=list[TenantResponse])
async def list_tenants(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_superadmin),
):
    result = await db.execute(select(Tenant).order_by(Tenant.created_at.desc()))
    return result.scalars().all()


@router.post("", response_model=TenantResponse)
async def create_tenant(
    data: TenantCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_superadmin),
):
    # Check ID not already taken
    existing = await db.get(Tenant, data.id)
    if existing:
        raise HTTPException(status_code=409, detail="Tenant ID already exists")

    tenant = Tenant(
        id=data.id,
        name=data.name,
        active=True,
    )
    db.add(tenant)
    await db.commit()
    await db.refresh(tenant)
    return tenant


@router.get("/{tenant_id}", response_model=TenantResponse)
async def get_tenant(
    tenant_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_superadmin),
):
    tenant = await db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant


@router.patch("/{tenant_id}", response_model=TenantResponse)
async def update_tenant(
    tenant_id: str,
    data: TenantUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_superadmin),
):
    tenant = await db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    if data.name is not None:
        tenant.name = data.name
    if data.active is not None:
        tenant.active = data.active

    await db.commit()
    await db.refresh(tenant)
    return tenant


@router.delete("/{tenant_id}")
async def delete_tenant(
    tenant_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_superadmin),
):
    tenant = await db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Soft delete — just deactivate
    tenant.active = False
    await db.commit()
    return {"status": "deactivated", "id": tenant_id}