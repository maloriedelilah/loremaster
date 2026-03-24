"""
Loremaster — Registrar Model
Workspace routing signatures — entities mapped to workspaces.
"""

from sqlalchemy import Column, String, Integer, Text, DateTime
from sqlalchemy.sql import func
from ..database import Base


class WorkspaceSignature(Base):
    __tablename__ = "workspace_signatures"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id       = Column(String, nullable=False, index=True)
    universe_id     = Column(String, nullable=False, index=True)
    workspace_id    = Column(String, nullable=False)
    workspace_slug  = Column(String, nullable=False)
    entity_type     = Column(String, nullable=False)   # character | ship | location | era | series | event
    entity_name     = Column(String, nullable=False)
    aliases         = Column(Text, nullable=True)       # JSON array
    source_books    = Column(Text, nullable=True)       # JSON array
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())