"""
Loremaster — Registrar Model
"""

from sqlalchemy import Column, String, Integer, Text, DateTime
from sqlalchemy.sql import func
from ..database import Base


class WorkspaceSignature(Base):
    __tablename__ = "workspace_signatures"
    __table_args__ = {"extend_existing": True}

    id              = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id       = Column(String, nullable=False, index=True)
    universe_id     = Column(String, nullable=False, index=True)
    workspace_id    = Column(String, nullable=False)
    workspace_slug  = Column(String, nullable=False)
    entity_type     = Column(String, nullable=False)
    entity_name     = Column(String, nullable=False)
    aliases         = Column(Text, nullable=True)
    source_books    = Column(Text, nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())