"""
Loremaster — Book Schemas
"""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class BookCreate(BaseModel):
    title: str
    series: str
    era: str
    series_order: Optional[str] = None
    format: Optional[str] = None
    uses_parts: bool = False
    pov_markers: bool = False
    has_drop_caps: bool = False
    is_extended_content: bool = False
    date_identifier: Optional[str] = None
    source_books: Optional[list[str]] = None
    chapter_header_styles: Optional[list[str]] = None
    skip_headings_extra: Optional[list[str]] = None
    recap_headings_extra: Optional[list[str]] = None
    appendix_headings_extra: Optional[list[str]] = None


class BookUpdate(BaseModel):
    title: Optional[str] = None
    series: Optional[str] = None
    era: Optional[str] = None
    series_order: Optional[str] = None
    format: Optional[str] = None
    uses_parts: Optional[bool] = None
    pov_markers: Optional[bool] = None
    has_drop_caps: Optional[bool] = None
    is_extended_content: Optional[bool] = None
    date_identifier: Optional[str] = None
    source_books: Optional[list[str]] = None
    chapter_header_styles: Optional[list[str]] = None
    skip_headings_extra: Optional[list[str]] = None
    recap_headings_extra: Optional[list[str]] = None
    appendix_headings_extra: Optional[list[str]] = None


class BookResponse(BaseModel):
    id: str
    tenant_id: str
    universe_id: str
    workspace_id: str
    title: str
    series: str
    era: str
    series_order: Optional[str]
    format: Optional[str]
    uses_parts: bool
    pov_markers: bool
    has_drop_caps: bool
    is_extended_content: bool
    date_identifier: Optional[str]
    filename: Optional[str]
    status: str
    chunk_count: Optional[int]
    chunks_embedded: Optional[int]
    error_message: Optional[str]
    chunkinator_job_id: Optional[str]
    dry_run_result: Optional[str]
    skip_headings_extra: Optional[str]
    recap_headings_extra: Optional[str]
    appendix_headings_extra: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}