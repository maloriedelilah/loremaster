from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


# ── Universe ────────────────────────────────────────────────────────────────

class UniverseCreate(BaseModel):
    name: str
    description: Optional[str] = None
    default_prompt: Optional[str] = None


class UniverseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    default_prompt: Optional[str] = None
    default_workspace: Optional[str] = None
    active: Optional[bool] = None


class UniverseResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    description: Optional[str]
    default_prompt: Optional[str]
    default_workspace: Optional[str]
    active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Workspace ────────────────────────────────────────────────────────────────

class WorkspaceCreate(BaseModel):
    name: str
    prompt: Optional[str] = None
    context_snippets: int = Field(default=10, ge=5, le=20)


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    prompt: Optional[str] = None
    context_snippets: Optional[int] = Field(default=None, ge=5, le=20)
    active: Optional[bool] = None


class WorkspaceResponse(BaseModel):
    id: str
    universe_id: str
    tenant_id: str
    name: str
    slug: str
    prompt: Optional[str]
    context_snippets: int
    active: bool
    created_at: datetime

    model_config = {"from_attributes": True}