from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    corrected_text: Optional[str] = None
    site_id: Optional[int] = None
    review_status: Optional[str] = None


class DocumentListItem(BaseModel):
    id: int
    site_id: Optional[int] = None
    site_name: Optional[str] = None
    title: str
    file_type: str
    original_filename: Optional[str] = None
    file_size: Optional[int] = None
    created_at: datetime
    has_corrected_text: bool = False
    extracted_length: int = 0
    processing_status: str = "uploaded"
    review_status: str = "unreviewed"
    ocr_method: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class DocumentDetail(BaseModel):
    id: int
    site_id: Optional[int] = None
    site_name: Optional[str] = None
    title: str
    file_type: str
    original_filename: Optional[str] = None
    file_size: Optional[int] = None
    file_url: Optional[str] = None
    extracted_text: Optional[str] = None
    corrected_text: Optional[str] = None
    storage_provider: str = "local"
    processing_status: str = "uploaded"
    review_status: str = "unreviewed"
    ocr_method: Optional[str] = None
    extraction_language: Optional[str] = None
    page_count: Optional[int] = None
    ocr_confidence: Optional[float] = None
    processing_error: Optional[str] = None
    processing_started_at: Optional[datetime] = None
    processing_completed_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentUploadResponse(DocumentDetail):
    method: Optional[str] = None
    message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
