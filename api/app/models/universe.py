"""
Loremaster — Universe, Workspace, Tenant Models
"""

from sqlalchemy import Column, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from ..database import Base


class Tenant(Base):
    __tablename__ = "tenants"

    id          = Column(String, primary_key=True)
    name        = Column(String, nullable=False)
    active      = Column(Boolean, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())


class Universe(Base):
    __tablename__ = "universes"

    id                  = Column(String, primary_key=True)
    tenant_id           = Column(String, nullable=False, index=True)
    name                = Column(String, nullable=False)
    description         = Column(Text, nullable=True)
    default_workspace   = Column(String, nullable=True)  # fallback workspace slug
    active              = Column(Boolean, default=True)
    created_at          = Column(DateTime(timezone=True), server_default=func.now())
    updated_at          = Column(DateTime(timezone=True), onupdate=func.now())


class Workspace(Base):
    __tablename__ = "workspaces"

    id          = Column(String, primary_key=True)
    universe_id = Column(String, nullable=False, index=True)
    tenant_id   = Column(String, nullable=False, index=True)
    name        = Column(String, nullable=False)
    slug        = Column(String, nullable=False)   # AnythingLLM workspace slug
    active      = Column(Boolean, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())