import logging
import mimetypes
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.archival_document import ArchivalDocument
from app.models.heritage_site import HeritageSite
from app.schemas.document import DocumentDetail, DocumentListItem, DocumentUpdate, DocumentUploadResponse
from app.security import CuratorIdentity, require_curator
from app.services.storage import (
    StorageConfigurationError,
    StorageOperationError,
    get_document_storage,
)
from app.services.audit import add_audit_event
from app.services.document_processing import processing_mode, process_document, submit_document_processing

logger = logging.getLogger("heritagelens.documents")
router = APIRouter(prefix="/api/documents", tags=["Archival Documents"])

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".tif"}
REVIEW_STATES = {"unreviewed", "needs_review", "approved"}


def _max_file_size() -> int:
    try:
        megabytes = int(os.getenv("MAX_FILE_SIZE_MB", "25"))
    except ValueError:
        megabytes = 25
    return max(1, megabytes) * 1024 * 1024


def _file_url(doc: ArchivalDocument) -> str | None:
    return f"/api/documents/{doc.id}/download" if (doc.storage_key or doc.file_path) else None


def _document_detail(doc: ArchivalDocument, site_name: str | None = None) -> DocumentDetail:
    return DocumentDetail(
        id=doc.id, site_id=doc.site_id, site_name=site_name, title=doc.title,
        file_type=doc.file_type, original_filename=doc.original_filename,
        file_size=doc.file_size, file_url=_file_url(doc), extracted_text=doc.extracted_text,
        corrected_text=doc.corrected_text, storage_provider=doc.storage_provider,
        processing_status=doc.processing_status, review_status=doc.review_status,
        ocr_method=doc.ocr_method, extraction_language=doc.extraction_language,
        page_count=doc.page_count, ocr_confidence=doc.ocr_confidence,
        processing_error=doc.processing_error, processing_started_at=doc.processing_started_at,
        processing_completed_at=doc.processing_completed_at, reviewed_at=doc.reviewed_at,
        updated_at=doc.updated_at, created_at=doc.created_at,
    )


@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    site_id: Optional[int] = Form(None),
    title: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    _curator: CuratorIdentity = Depends(require_curator),
):
    """Persist an original, then extract text while recording durable processing state."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected for upload.")
    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file format '{suffix}'.")

    valid_site_id = site_id if isinstance(site_id, int) else None
    site = None
    if valid_site_id is not None:
        site = db.query(HeritageSite).filter(HeritageSite.id == valid_site_id).first()
        if not site:
            raise HTTPException(status_code=404, detail=f"Heritage site with ID {valid_site_id} was not found.")

    try:
        content = await file.read()
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Failed to read uploaded file.") from exc
    file_size = len(content)
    if file_size == 0:
        raise HTTPException(status_code=400, detail="The uploaded file is empty (0 bytes).")
    max_file_size = _max_file_size()
    if file_size > max_file_size:
        raise HTTPException(status_code=413, detail=f"File exceeds the {max_file_size // (1024 * 1024)} MB limit.")

    clean_name = re.sub(r"[^a-zA-Z0-9_.-]", "_", Path(file.filename).name)
    now = datetime.now(timezone.utc)
    object_key = f"documents/{now:%Y/%m}/{uuid.uuid4().hex}_{clean_name}"
    try:
        storage = get_document_storage()
        storage.store(object_key, content, file.content_type or mimetypes.guess_type(file.filename)[0])
    except (StorageConfigurationError, StorageOperationError) as exc:
        logger.error("Document storage failed: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    valid_title = title.strip() if isinstance(title, str) and title.strip() else None
    new_doc = ArchivalDocument(
        site_id=valid_site_id, title=valid_title or Path(file.filename).stem.replace("_", " ").title(),
        file_type="PDF" if suffix == ".pdf" else "Image", original_filename=file.filename,
        file_path=None, file_size=file_size, storage_provider=storage.provider_name,
        storage_key=object_key, processing_status="uploaded", review_status="unreviewed",
    )
    try:
        db.add(new_doc)
        db.flush()
        add_audit_event(
            db, action="document.upload", resource_type="archival_document", resource_id=new_doc.id,
            details={"storage_provider": storage.provider_name, "file_type": new_doc.file_type},
        )
        db.commit()
        db.refresh(new_doc)
    except Exception as exc:
        db.rollback()
        try:
            storage.delete(object_key)
        except StorageOperationError:
            logger.exception("Could not clean up object after database failure")
        raise HTTPException(status_code=500, detail="Document metadata could not be saved.") from exc

    if processing_mode() == "background":
        submit_document_processing(new_doc.id)
        message = "Original stored securely and queued for text extraction."
        method = None
    else:
        outcome = process_document(new_doc.id, db=db)
        db.expire_all()
        new_doc = db.query(ArchivalDocument).filter(ArchivalDocument.id == new_doc.id).one()
        if not outcome.success:
            raise HTTPException(
                status_code=422,
                detail=f"Original stored as document #{new_doc.id}, but processing failed: {outcome.message}",
            )
        message = outcome.message
        method = outcome.method

    return DocumentUploadResponse(
        **_document_detail(new_doc, site.name if site else None).model_dump(),
        method=method, message=message,
    )


@router.get("", response_model=List[DocumentListItem])
def list_documents(site_id: Optional[int] = Query(None), skip: int = Query(0, ge=0),
                   limit: int = Query(50, ge=1, le=100), db: Session = Depends(get_db)):
    query = db.query(ArchivalDocument, HeritageSite.name.label("site_name")).outerjoin(
        HeritageSite, HeritageSite.id == ArchivalDocument.site_id)
    if isinstance(site_id, int):
        query = query.filter(ArchivalDocument.site_id == site_id)
    results = query.order_by(ArchivalDocument.created_at.desc()).offset(skip if isinstance(skip, int) else 0).limit(
        limit if isinstance(limit, int) else 50).all()
    return [DocumentListItem(
        id=doc.id, site_id=doc.site_id, site_name=site_name, title=doc.title,
        file_type=doc.file_type, original_filename=doc.original_filename, file_size=doc.file_size,
        created_at=doc.created_at, has_corrected_text=bool(doc.corrected_text and doc.corrected_text.strip()),
        extracted_length=len(doc.extracted_text or ""), processing_status=doc.processing_status,
        review_status=doc.review_status, ocr_method=doc.ocr_method,
    ) for doc, site_name in results]


@router.get("/{id}/download")
def download_document(id: int, db: Session = Depends(get_db)):
    doc = db.query(ArchivalDocument).filter(ArchivalDocument.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail=f"Archival document #{id} not found.")
    if doc.storage_key:
        try:
            target = get_document_storage(doc.storage_provider).download_target(doc.storage_key)
        except (StorageConfigurationError, StorageOperationError) as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        if target.redirect_url:
            return RedirectResponse(target.redirect_url, status_code=307)
        return FileResponse(target.local_path, filename=doc.original_filename)
    if doc.file_path and Path(doc.file_path).is_file():
        return FileResponse(doc.file_path, filename=doc.original_filename)
    raise HTTPException(status_code=404, detail="The original file is not available.")


@router.get("/{id}", response_model=DocumentDetail)
def get_document(id: int, db: Session = Depends(get_db)):
    result = db.query(ArchivalDocument, HeritageSite.name.label("site_name")).outerjoin(
        HeritageSite, HeritageSite.id == ArchivalDocument.site_id).filter(ArchivalDocument.id == id).first()
    if not result:
        raise HTTPException(status_code=404, detail=f"Archival document #{id} not found.")
    return _document_detail(result[0], result[1])


@router.put("/{id}", response_model=DocumentDetail)
def update_document(id: int, payload: DocumentUpdate, db: Session = Depends(get_db),
                    _curator: CuratorIdentity = Depends(require_curator)):
    doc = db.query(ArchivalDocument).filter(ArchivalDocument.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail=f"Archival document #{id} not found.")
    if payload.site_id is not None:
        site = db.query(HeritageSite).filter(HeritageSite.id == payload.site_id).first()
        if not site:
            raise HTTPException(status_code=404, detail=f"Heritage site #{payload.site_id} does not exist.")
        doc.site_id = payload.site_id
    if payload.title is not None and payload.title.strip():
        doc.title = payload.title.strip()
    if payload.corrected_text is not None:
        doc.corrected_text = payload.corrected_text
    if payload.review_status is not None:
        if payload.review_status not in REVIEW_STATES:
            raise HTTPException(status_code=422, detail="Invalid review status.")
        doc.review_status = payload.review_status
        if payload.review_status == "approved":
            doc.reviewed_at = datetime.now(timezone.utc)
    changed_fields = sorted(payload.model_dump(exclude_unset=True))
    add_audit_event(
        db, action="document.update", resource_type="archival_document", resource_id=doc.id,
        details={"fields": changed_fields},
    )
    db.commit()
    db.refresh(doc)
    return _document_detail(doc, doc.site.name if doc.site else None)


@router.delete("/{id}")
def delete_document(id: int, db: Session = Depends(get_db),
                    _curator: CuratorIdentity = Depends(require_curator)):
    doc = db.query(ArchivalDocument).filter(ArchivalDocument.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail=f"Archival document #{id} not found.")
    try:
        if doc.storage_key:
            get_document_storage(doc.storage_provider).delete(doc.storage_key)
        elif doc.file_path and Path(doc.file_path).is_file():
            Path(doc.file_path).unlink()
    except (OSError, StorageConfigurationError, StorageOperationError) as exc:
        logger.error("Refusing metadata deletion after object cleanup failed: %s", exc)
        raise HTTPException(status_code=502, detail="Stored file cleanup failed; the database record was preserved.") from exc
    add_audit_event(db, action="document.delete", resource_type="archival_document", resource_id=doc.id)
    db.delete(doc)
    db.commit()
    return {"message": f"Archival document #{id} deleted successfully.", "id": id}
