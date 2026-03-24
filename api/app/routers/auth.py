"""
Loremaster — Auth Router
Login endpoints for superadmin and author roles.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models import User, UserRole
from ..services.auth import verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    tenant_id: str | None = None


@router.post("/superadmin/login", response_model=TokenResponse)
async def superadmin_login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Superadmin login — returns a superadmin-scoped JWT."""
    result = await db.execute(
        select(User).where(
            User.email == request.email,
            User.role == UserRole.SUPERADMIN,
            User.active == True,
        )
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    token = create_access_token({"sub": user.id, "role": user.role})
    return TokenResponse(access_token=token, role=user.role)


@router.post("/login", response_model=TokenResponse)
async def author_login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Author login — returns an author-scoped JWT."""
    result = await db.execute(
        select(User).where(
            User.email == request.email,
            User.role == UserRole.AUTHOR,
            User.active == True,
        )
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    token = create_access_token({"sub": user.id, "role": user.role, "tenant_id": user.tenant_id})
    return TokenResponse(access_token=token, role=user.role, tenant_id=user.tenant_id)