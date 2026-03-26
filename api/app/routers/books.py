"""
Loremaster — Books Router
Authors manage books within workspaces.
"""

import uuid
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models import Universe, Workspace, User
from ..models.book import Book, BookStatus
from ..schemas.book import BookCreate, BookUpdate, BookResponse
from ..services.auth import require_author
from ..services.chunkinator import chunkinator

router = APIRouter(prefix="/universes/{universe_id}/workspaces/{workspace_id}/books", tags=["books"])


def build_manifest(book: Book, workspace: Workspace) -> dict:
    """Build a Chunkinator-compatible manifest entry for this book."""
    return {
        "filename": book.filename,
        "title": book.title,
        "series": book.series,
        "era": book.era,
        "workspace": workspace.slug,
        "uses_parts": book.uses_parts,
        "pov_markers": book.pov_markers,
        "has_drop_caps": book.has_drop_caps,
        "is_extended_content": book.is_extended_content,
        "date_identifier": book.date_identifier or "",
        "source_books": json.loads(book.source_books) if book.source_books else [],
        "chapter_header_styles": json.loads(book.chapter_header_styles) if book.chapter_header_styles else [],
        "skip_headings_extra": json.loads(book.skip_headings_extra) if book.skip_headings_extra else [],
        "recap_headings_extra": json.loads(book.recap_headings_extra) if book.recap_headings_extra else [],
        "appendix_headings_extra": json.loads(book.appendix_headings_extra) if book.appendix_headings_extra else [],
    }


async def get_workspace_for_user(
    universe_id: str,
    workspace_id: str,
    current_user: User,
    db: AsyncSession,
) -> Workspace:
    """Verify universe and workspace belong to the current user's tenant."""
    universe = await db.get(Universe, universe_id)
    if not universe or universe.tenant_id != current_user.tenant_id or not universe.active:
        raise HTTPException(status_code=404, detail="Universe not found")

    workspace = await db.get(Workspace, workspace_id)
    if not workspace or workspace.tenant_id != current_user.tenant_id or not workspace.active:
        raise HTTPException(status_code=404, detail="Workspace not found")

    return workspace


# ── List / Get ────────────────────────────────────────────────────────────────

@router.get("", response_model=list[BookResponse])
async def list_books(
    universe_id: str,
    workspace_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_author),
):
    await get_workspace_for_user(universe_id, workspace_id, current_user, db)

    result = await db.execute(
        select(Book)
        .where(Book.workspace_id == workspace_id, Book.tenant_id == current_user.tenant_id)
        .order_by(Book.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{book_id}", response_model=BookResponse)
async def get_book(
    universe_id: str,
    workspace_id: str,
    book_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_author),
):
    await get_workspace_for_user(universe_id, workspace_id, current_user, db)

    book = await db.get(Book, book_id)
    if not book or book.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Book not found")
    return book


# ── Create ────────────────────────────────────────────────────────────────────

@router.post("", response_model=BookResponse)
async def create_book(
    universe_id: str,
    workspace_id: str,
    data: BookCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_author),
):
    await get_workspace_for_user(universe_id, workspace_id, current_user, db)

    book = Book(
        id=str(uuid.uuid4()),
        tenant_id=current_user.tenant_id,
        universe_id=universe_id,
        workspace_id=workspace_id,
        title=data.title,
        series=data.series,
        era=data.era,
        series_order=data.series_order,
        format=data.format,
        uses_parts=data.uses_parts,
        pov_markers=data.pov_markers,
        has_drop_caps=data.has_drop_caps,
        is_extended_content=data.is_extended_content,
        date_identifier=data.date_identifier,
        source_books=json.dumps(data.source_books) if data.source_books else None,
        chapter_header_styles=json.dumps(data.chapter_header_styles) if data.chapter_header_styles else None,
        skip_headings_extra=json.dumps(data.skip_headings_extra) if data.skip_headings_extra else None,
        recap_headings_extra=json.dumps(data.recap_headings_extra) if data.recap_headings_extra else None,
        appendix_headings_extra=json.dumps(data.appendix_headings_extra) if data.appendix_headings_extra else None,
        status=BookStatus.PENDING,
    )
    db.add(book)
    await db.commit()
    await db.refresh(book)
    return book


# ── Update metadata ───────────────────────────────────────────────────────────

@router.patch("/{book_id}", response_model=BookResponse)
async def update_book(
    universe_id: str,
    workspace_id: str,
    book_id: str,
    data: BookUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_author),
):
    await get_workspace_for_user(universe_id, workspace_id, current_user, db)

    book = await db.get(Book, book_id)
    if not book or book.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Book not found")

    for field, value in data.model_dump(exclude_none=True).items():
        if field in ("source_books", "chapter_header_styles", "skip_headings_extra",
                     "recap_headings_extra", "appendix_headings_extra"):
            setattr(book, field, json.dumps(value) if value else None)
        else:
            setattr(book, field, value)

    await db.commit()
    await db.refresh(book)
    return book


# ── Upload .docx ──────────────────────────────────────────────────────────────

@router.post("/{book_id}/upload", response_model=BookResponse)
async def upload_book_file(
    universe_id: str,
    workspace_id: str,
    book_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_author),
):
    workspace = await get_workspace_for_user(universe_id, workspace_id, current_user, db)

    book = await db.get(Book, book_id)
    if not book or book.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Book not found")

    if not file.filename.endswith(".docx"):
        raise HTTPException(status_code=400, detail="Only .docx files are supported")

    file_bytes = await file.read()
    manifest = build_manifest(book, workspace)
    manifest["filename"] = file.filename

    # Upload to Chunkinator Service
    result = await chunkinator.upload(file_bytes, file.filename, manifest)
    if not result:
        raise HTTPException(status_code=502, detail="Failed to upload to Chunkinator Service")

    book.filename = file.filename
    book.file_stored_at = datetime.now(timezone.utc)
    book.chunkinator_job_id = result.get("job_id")
    book.status = BookStatus.STORED
    await db.commit()
    await db.refresh(book)
    return book


# ── Dry Run ───────────────────────────────────────────────────────────────────

@router.post("/{book_id}/dry-run", response_model=BookResponse)
async def dry_run_book(
    universe_id: str,
    workspace_id: str,
    book_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_author),
):
    await get_workspace_for_user(universe_id, workspace_id, current_user, db)

    book = await db.get(Book, book_id)
    if not book or book.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Book not found")

    if not book.chunkinator_job_id:
        raise HTTPException(status_code=400, detail="No file uploaded yet")

    result = await chunkinator.dry_run(book.chunkinator_job_id)
    if not result:
        raise HTTPException(status_code=502, detail="Dry run failed — check Chunkinator Service")

    book.status = BookStatus.DRY_RUN
    book.dry_run_result = json.dumps(result)
    await db.commit()
    await db.refresh(book)
    return book


# ── Approve & Chunk ───────────────────────────────────────────────────────────

@router.post("/{book_id}/approve", response_model=BookResponse)
async def approve_and_chunk(
    universe_id: str,
    workspace_id: str,
    book_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_author),
):
    await get_workspace_for_user(universe_id, workspace_id, current_user, db)

    book = await db.get(Book, book_id)
    if not book or book.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Book not found")

    if book.status not in (BookStatus.DRY_RUN, BookStatus.VALIDATING):
        raise HTTPException(status_code=400, detail="Book must be in dry_run status before approving")

    result = await chunkinator.chunk(book.chunkinator_job_id)
    if not result:
        raise HTTPException(status_code=502, detail="Chunking failed — check Chunkinator Service")

    book.status = BookStatus.CHUNKING
    await db.commit()
    await db.refresh(book)
    return book


# ── Poll Job Status ───────────────────────────────────────────────────────────

@router.get("/{book_id}/job-status", response_model=BookResponse)
async def poll_job_status(
    universe_id: str,
    workspace_id: str,
    book_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_author),
):
    await get_workspace_for_user(universe_id, workspace_id, current_user, db)

    book = await db.get(Book, book_id)
    if not book or book.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Book not found")

    if not book.chunkinator_job_id:
        return book

    job = await chunkinator.get_job(book.chunkinator_job_id)
    if not job:
        return book

    job_status = job.get("status")

    if job_status == "complete":
        book.status = BookStatus.CHUNKED
        book.chunk_count = job.get("chunk_count")
    elif job_status == "error":
        book.status = BookStatus.ERROR
        book.error_message = job.get("error")

    await db.commit()
    await db.refresh(book)
    return book