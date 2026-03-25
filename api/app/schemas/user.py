from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional
from ..models.user import UserRole


class UserCreate(BaseModel):
    email: str
    password: str
    tenant_id: str


class UserUpdate(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    active: Optional[bool] = None


class UserResponse(BaseModel):
    id: str
    email: str
    role: UserRole
    tenant_id: Optional[str]
    active: bool
    created_at: datetime

    model_config = {"from_attributes": True}