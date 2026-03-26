"""
Loremaster — User Model
"""

from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.sql import func
import enum
from ..database import Base


class UserRole(str, enum.Enum):
    SUPERADMIN = "superadmin"
    AUTHOR = "author"


class User(Base):
    __tablename__ = "users"
    __table_args__ = {"extend_existing": True}

    id            = Column(String, primary_key=True)
    email         = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role          = Column(String, nullable=False, default=UserRole.AUTHOR)
    tenant_id     = Column(String, nullable=True)
    active        = Column(Boolean, default=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), onupdate=func.now())