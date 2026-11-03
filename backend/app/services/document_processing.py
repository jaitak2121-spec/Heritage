from __future__ import annotations

import logging
import os
import tempfile
import threading
from concurrent.futures import Future, ThreadPoolExecutor
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import SessionLocal
from app.models.archival_document import ArchivalDocument
from app.services.audit import add_audit_event
from app.services.extraction import ExtractionError, OCRUnavailableError, extract_document_text
from app.services.storage import (
    LocalDocumentStorage,
    StorageConfigurationError,
    StorageOperationError,
    get_document_storage,
)


logger = logging.getLogger("heritagelens.document_processing")


@dataclass(frozen=True)
class ProcessingOutcome:
    success: bool
    message: str
    method: str | None = None


_executor_instance: ThreadPoolExecutor | None = None
_executor_lock = threading.Lock()
_active_jobs: set[int] = set()
_active_jobs_lock = threading.Lock()


def processing_mode() -> str:
    return "background" if os.getenv("DOCUMENT_PROCESSING_MODE", "inline").strip().lower() == "background" else "inline"


def _executor() -> ThreadPoolExecutor:
    global _executor_instance
    with _executor_lock:
        if _executor_instance is None:
            try:
                workers = max(1, min(int(os.getenv("DOCUMENT_PROCESSING_WORKERS", "1")), 4))
            except ValueError:
                workers = 1
            _executor_instance = ThreadPoolExecutor(max_workers=workers, thread_name_prefix="heritage-ocr")
        return _executor_instance


def _materialize_document(doc: ArchivalDocument) -> tuple[Path, bool]:
    if doc.storage_key:
        storage = get_document_storage(doc.storage_provider)
        if isinstance(storage, LocalDocumentStorage):
            target = storage.download_target(doc.storage_key)
            return target.local_path, False
        content = storage.read(doc.storage_key)
        suffix = Path(doc.original_filename or "document.bin").suffix
        descriptor, name = tempfile.mkstemp(suffix=suffix)
        os.close(descriptor)
        path = Path(name)
        path.write_bytes(content)
        return path, True
    if doc.file_path and Path(doc.file_path).is_file():
        return Path(doc.file_path), False
    raise StorageOperationError("The original document is unavailable for processing.")


def process_document(document_id: int, db: Session | None = None) -> ProcessingOutcome:
    owns_session = db is None
    session = db or SessionLocal()
    temporary_path: Path | None = None
    try:
        doc = session.query(ArchivalDocument).filter(ArchivalDocument.id == document_id).first()
        if not doc:
            return ProcessingOutcome(False, "Document record no longer exists.")

        doc.processing_status = "processing"
        doc.processing_started_at = datetime.now(timezone.utc)
        doc.processing_completed_at = None
        doc.processing_error = None
        session.commit()

        extraction_path, is_temporary = _materialize_document(doc)
        temporary_path = extraction_path if is_temporary else None
        language = doc.extraction_language or "eng"
        extraction = extract_document_text(extraction_path, doc.original_filename or extraction_path.name, language)

        doc.extracted_text = extraction.get("text", "")
        doc.ocr_method = extraction.get("method")
        doc.extraction_language = language if doc.ocr_method == "tesseract_ocr" else None
        doc.page_count = extraction.get("page_count")
        doc.ocr_confidence = extraction.get("confidence")
        doc.processing_status = "extracted"
        doc.review_status = "needs_review"
        doc.processing_completed_at = datetime.now(timezone.utc)
        doc.processing_error = None
        add_audit_event(
            session, action="document.extract", resource_type="archival_document", resource_id=doc.id,
            details={"method": doc.ocr_method, "page_count": doc.page_count},
        )
        session.commit()
        return ProcessingOutcome(True, extraction.get("message") or "Text extraction completed.", doc.ocr_method)
    except (OCRUnavailableError, ExtractionError, StorageConfigurationError, StorageOperationError) as exc:
        session.rollback()
        failed = session.query(ArchivalDocument).filter(ArchivalDocument.id == document_id).first()
        if failed:
            failed.processing_status = "failed"
            failed.processing_error = str(exc)
            failed.processing_completed_at = datetime.now(timezone.utc)
            add_audit_event(
                session, action="document.extract", resource_type="archival_document", resource_id=failed.id,
                outcome="failure", details={"error_type": type(exc).__name__},
            )
            session.commit()
        return ProcessingOutcome(False, str(exc))
    except Exception:
        session.rollback()
        logger.exception("Unexpected processing failure for document %s", document_id)
        failed = session.query(ArchivalDocument).filter(ArchivalDocument.id == document_id).first()
        if failed:
            failed.processing_status = "failed"
            failed.processing_error = "Unexpected document processing failure."
            failed.processing_completed_at = datetime.now(timezone.utc)
            add_audit_event(
                session, action="document.extract", resource_type="archival_document", resource_id=failed.id,
                outcome="failure", details={"error_type": "UnexpectedError"},
            )
            session.commit()
        return ProcessingOutcome(False, "Unexpected document processing failure.")
    finally:
        if temporary_path:
            temporary_path.unlink(missing_ok=True)
        if owns_session:
            session.close()


def _job_finished(document_id: int, future: Future) -> None:
    with _active_jobs_lock:
        _active_jobs.discard(document_id)
    try:
        future.result()
    except Exception:
        logger.exception("Unhandled background processing failure for document %s", document_id)


def submit_document_processing(document_id: int) -> bool:
    with _active_jobs_lock:
        if document_id in _active_jobs:
            return False
        _active_jobs.add(document_id)
    future = _executor().submit(process_document, document_id)
    future.add_done_callback(lambda completed: _job_finished(document_id, completed))
    return True


def recover_pending_documents() -> int:
    if processing_mode() != "background":
        return 0
    db = SessionLocal()
    try:
        ids = [row[0] for row in db.query(ArchivalDocument.id).filter(
            ArchivalDocument.processing_status.in_(("uploaded", "processing")),
            or_(ArchivalDocument.storage_key.is_not(None), ArchivalDocument.file_path.is_not(None)),
        ).all()]
    finally:
        db.close()
    return sum(1 for document_id in ids if submit_document_processing(document_id))


def shutdown_processing_executor() -> None:
    global _executor_instance
    with _executor_lock:
        executor = _executor_instance
        _executor_instance = None
    if executor:
        executor.shutdown(wait=False, cancel_futures=False)
