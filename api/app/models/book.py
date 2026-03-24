"""
Loremaster — Book Model
"""

from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, Enum
from sqlalchemy.sql import func
import enum
from ..database import Base


class BookStatus(str, enum.Enum):
    PENDING     = "pending"
    UPLOADING   = "uploading"
    STORED      = "stored"
    DRY_RUN     = "dry_run"
    VALIDATING  = "validating"
    APPROVED    = "approved"
    CHUNKING    = "chunking"
    CHUNKED     = "chunked"
    EMBEDDING   = "embedding"
    LIVE        = "live"
    ERROR       = "error"


class Book(Base):
    __tablename__ = "books"

    id              = Column(String, primary_key=True)
    tenant_id       = Column(String, nullable=False, index=True)
    universe_id     = Column(String, nullable=False, index=True)
    workspace_id    = Column(String, nullable=False, index=True)

    # Manifest fields
    title           = Column(String, nullable=False)
    series          = Column(String, nullable=False)
    series_order    = Column(String, nullable=True)
    format          = Column(String, nullable=True)      # novel | novella | short_story | collection
    era             = Column(String, nullable=False)
    uses_parts      = Column(Boolean, default=False)
    pov_markers     = Column(Boolean, default=False)
    has_drop_caps   = Column(Boolean, default=False)
    is_extended_content = Column(Boolean, default=False)
    date_identifier = Column(String, nullable=True)      # e.g. "COMMON ERA"
    source_books    = Column(Text, nullable=True)        # JSON array
    chapter_header_styles = Column(Text, nullable=True)  # JSON array
    skip_headings_extra   = Column(Text, nullable=True)  # JSON array
    recap_headings_extra  = Column(Text, nullable=True)  # JSON array
    appendix_headings_extra = Column(Text, nullable=True) # JSON array

    # File tracking
    filename        = Column(String, nullable=True)
    file_stored_at  = Column(DateTime(timezone=True), nullable=True)
    file_pushed_at  = Column(DateTime(timezone=True), nullable=True)

    # Pipeline status
    status          = Column(Enum(BookStatus), default=BookStatus.PENDING, nullable=False)
    dry_run_result  = Column(Text, nullable=True)        # JSON: chapter list from dry run
    chunk_count     = Column(Integer, nullable=True)
    chunks_embedded = Column(Integer, nullable=True)
    error_message   = Column(Text, nullable=True)
    chunkinator_job_id = Column(String, nullable=True)  # job ID from Chunkinator Service

    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())