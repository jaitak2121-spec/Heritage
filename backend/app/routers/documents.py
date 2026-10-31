import os
import re
import uuid
import logging
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.archival_document import ArchivalDocument
from app.models.heritage_site import HeritageSite
from app.schemas.document import (
    DocumentUploadResponse,
    DocumentUpdate,
    DocumentListItem,
    DocumentDetail,
)
from app.services.extraction import (
    extract_document_text,
    OCRUnavailableError,
    ExtractionError,
)

logger = logging.getLogger("heritagelens.documents")

router = APIRouter(prefix="/api/documents", tags=["Archival Documents"])

# Upload directory configuration
BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# 25 MB max upload size
MAX_FILE_SIZE = 25 * 1024 * 1024
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".tif"}


@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(..., description="Archival document file (PDF, PNG, JPG/JPEG)"),
    site_id: Optional[int] = Form(None, description="Optional heritage site identifier to attach document to"),
    title: Optional[str] = Form(None, description="Optional title; defaults to formatted filename"),
    db: Session = Depends(get_db),
):
    """
    Upload and digitize an archival document or historical image.
    Extracts text using PyMuPDF for vector PDFs and Tesseract OCR for scanned records/images.
    """
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file selected for upload.")

    # 1. Validate file extension
    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{suffix}'. Accepted formats are PDF (.pdf), PNG (.png), and JPEG (.jpg, .jpeg).",
        )

    # 2. Validate site_id if provided
    valid_site_id = site_id if isinstance(site_id, int) else None
    site = None
    if valid_site_id is not None:
        site = db.query(HeritageSite).filter(HeritageSite.id == valid_site_id).first()
        if not site:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Heritage site with ID {valid_site_id} was not found in the archive database.",
            )

    # 3. Read file content and validate size
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded file: {str(e)}",
        )

    file_size = len(content)
    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty (0 bytes).",
        )
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size ({file_size / (1024 * 1024):.1f} MB) exceeds the maximum allowed limit of 25 MB.",
        )

    # 4. Save file safely to disk
    clean_name = re.sub(r"[^a-zA-Z0-9_.-]", "_", file.filename)
    unique_filename = f"{uuid.uuid4().hex[:12]}_{clean_name}"
    stored_path = UPLOADS_DIR / unique_filename

    try:
        with open(stored_path, "wb") as f:
            f.write(content)
    except Exception as e:
        logger.error(f"Failed to write file to disk: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not persist uploaded file to storage: {str(e)}",
        )

    # 5. Extract text via modular pipeline
    try:
        extraction_res = extract_document_text(stored_path, file.filename)
    except OCRUnavailableError as ocr_err:
        # Clean up stored file if OCR was required but unavailable
        if stored_path.exists():
            try:
                stored_path.unlink()
            except OSError:
                pass
        logger.warning(f"OCR dependency unavailable: {ocr_err}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(ocr_err),
        )
    except ExtractionError as ext_err:
        if stored_path.exists():
            try:
                stored_path.unlink()
            except OSError:
                pass
        logger.error(f"Text extraction failed: {ext_err}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ext_err),
        )
    except Exception as e:
        if stored_path.exists():
            try:
                stored_path.unlink()
            except OSError:
                pass
        logger.exception("Unexpected error in document extraction pipeline")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected extraction error: {str(e)}",
        )

    valid_title = title.strip() if (isinstance(title, str) and title.strip()) else None
    doc_title = valid_title if valid_title else file.filename.rsplit(".", 1)[0].replace("_", " ").title()
    file_type_label = "PDF" if suffix == ".pdf" else "Image"

    new_doc = ArchivalDocument(
        site_id=valid_site_id,
        title=doc_title,
        file_type=file_type_label,
        original_filename=file.filename,
        file_path=str(stored_path),
        file_size=file_size,
        extracted_text=extraction_res.get("text", ""),
        corrected_text=None,
    )

    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    return DocumentUploadResponse(
        id=new_doc.id,
        site_id=new_doc.site_id,
        site_name=site.name if site else None,
        title=new_doc.title,
        file_type=new_doc.file_type,
        original_filename=new_doc.original_filename,
        file_size=new_doc.file_size,
        extracted_text=new_doc.extracted_text,
        corrected_text=new_doc.corrected_text,
        created_at=new_doc.created_at,
        method=extraction_res.get("method"),
        message=extraction_res.get("message"),
    )


@router.get("", response_model=List[DocumentListItem])
def list_documents(
    site_id: Optional[int] = Query(None, description="Filter documents by heritage site ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    List uploaded archival documents with site associations and text lengths.
    """
    skip_val = skip if isinstance(skip, int) else 0
    limit_val = limit if isinstance(limit, int) else 50

    query = db.query(ArchivalDocument, HeritageSite.name.label("site_name"))\
              .outerjoin(HeritageSite, HeritageSite.id == ArchivalDocument.site_id)

    valid_site_filter = site_id if isinstance(site_id, int) else None
    if valid_site_filter:
        query = query.filter(ArchivalDocument.site_id == valid_site_filter)

    results = query.order_by(ArchivalDocument.created_at.desc()).offset(skip_val).limit(limit_val).all()

    items = []
    for doc, site_name in results:
        items.append(
            DocumentListItem(
                id=doc.id,
                site_id=doc.site_id,
                site_name=site_name,
                title=doc.title,
                file_type=doc.file_type,
                original_filename=doc.original_filename,
                file_size=getattr(doc, "file_size", None),
                created_at=doc.created_at,
                has_corrected_text=bool(doc.corrected_text and doc.corrected_text.strip()),
                extracted_length=len(doc.extracted_text) if doc.extracted_text else 0,
            )
        )
    return items


@router.get("/{id}", response_model=DocumentDetail)
def get_document(
    id: int,
    db: Session = Depends(get_db),
):
    """
    Retrieve full details and extracted/corrected text of a specific archival document.
    """
    res = db.query(ArchivalDocument, HeritageSite.name.label("site_name"))\
            .outerjoin(HeritageSite, HeritageSite.id == ArchivalDocument.site_id)\
            .filter(ArchivalDocument.id == id)\
            .first()

    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Archival document #{id} not found.",
        )

    doc, site_name = res
    file_url = None
    if doc.file_path and os.path.exists(doc.file_path):
        filename = Path(doc.file_path).name
        file_url = f"/uploads/{filename}"

    return DocumentDetail(
        id=doc.id,
        site_id=doc.site_id,
        site_name=site_name,
        title=doc.title,
        file_type=doc.file_type,
        original_filename=doc.original_filename,
        file_size=getattr(doc, "file_size", None),
        file_url=file_url,
        extracted_text=doc.extracted_text,
        corrected_text=doc.corrected_text,
        created_at=doc.created_at,
    )


@router.put("/{id}", response_model=DocumentDetail)
def update_document(
    id: int,
    payload: DocumentUpdate,
    db: Session = Depends(get_db),
):
    """
    Save user-corrected extracted text or update document title/site association.
    """
    doc = db.query(ArchivalDocument).filter(ArchivalDocument.id == id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Archival document #{id} not found.",
        )

    if payload.site_id is not None:
        site = db.query(HeritageSite).filter(HeritageSite.id == payload.site_id).first()
        if not site:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Heritage site #{payload.site_id} does not exist.",
            )
        doc.site_id = payload.site_id

    if payload.title is not None and payload.title.strip():
        doc.title = payload.title.strip()

    if payload.corrected_text is not None:
        doc.corrected_text = payload.corrected_text

    db.commit()
    db.refresh(doc)

    site_name = doc.site.name if doc.site else None
    file_url = None
    if doc.file_path and os.path.exists(doc.file_path):
        filename = Path(doc.file_path).name
        file_url = f"/uploads/{filename}"

    return DocumentDetail(
        id=doc.id,
        site_id=doc.site_id,
        site_name=site_name,
        title=doc.title,
        file_type=doc.file_type,
        original_filename=doc.original_filename,
        file_size=getattr(doc, "file_size", None),
        file_url=file_url,
        extracted_text=doc.extracted_text,
        corrected_text=doc.corrected_text,
        created_at=doc.created_at,
    )


@router.delete("/{id}")
def delete_document(
    id: int,
    db: Session = Depends(get_db),
):
    """
    Delete an archival document record and safely clean up its stored file on disk.
    """
    doc = db.query(ArchivalDocument).filter(ArchivalDocument.id == id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Archival document #{id} not found.",
        )

    # Clean up file on disk if exists
    if doc.file_path and os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
            logger.info(f"Safely removed physical document file: {doc.file_path}")
        except Exception as e:
            logger.warning(f"Could not remove physical file {doc.file_path}: {e}")

    db.delete(doc)
    db.commit()

    return {
        "message": f"Archival document #{id} deleted successfully.",
        "id": id,
    }
