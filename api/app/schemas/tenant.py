from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class TenantCreate(BaseModel):
    id: str
    name: str


class TenantUpdate(BaseModel):
    name: Optional[str] = None
    active: Optional[bool] = None


class TenantResponse(BaseModel):
    id: str
    name: str
    active: bool
    created_at: datetime

    model_config = {"from_attributes": True}