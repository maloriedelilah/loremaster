"""
Loremaster — Users Router
Superadmin management of author user accounts.
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models import User, UserRole, Tenant
from ..schemas.user import UserCreate, UserUpdate, UserResponse
from ..services.auth import require_superadmin, hash_password

router = APIRouter(prefix="/admin/users", tags=["admin"])


@router.get("", response_model=list[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_superadmin),
):
    result = await db.execute(
        select(User)
        .where(User.role == UserRole.AUTHOR)
        .order_by(User.created_at.desc())
    )
    return result.scalars().all()


@router.get("/by-tenant/{tenant_id}", response_model=list[UserResponse])
async def list_users_by_tenant(
    tenant_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_superadmin),
):
    result = await db.execute(
        select(User)
        .where(User.tenant_id == tenant_id, User.role == UserRole.AUTHOR)
        .order_by(User.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=UserResponse)
async def create_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_superadmin),
):
    # Verify tenant exists
    tenant = await db.get(Tenant, data.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Check email not taken
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already in use")

    user = User(
        id=str(uuid.uuid4()),
        email=data.email,
        password_hash=hash_password(data.password),
        role=UserRole.AUTHOR,
        tenant_id=data.tenant_id,
        active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_superadmin),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if data.email is not None:
        user.email = data.email
    if data.password is not None:
        user.password_hash = hash_password(data.password)
    if data.active is not None:
        user.active = data.active

    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_superadmin),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.active = False
    await db.commit()
    return {"status": "deactivated", "id": user_id}