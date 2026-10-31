from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    corrected_text: Optional[str] = None
    site_id: Optional[int] = None


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
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentUploadResponse(BaseModel):
    id: int
    site_id: Optional[int] = None
    site_name: Optional[str] = None
    title: str
    file_type: str
    original_filename: Optional[str] = None
    file_size: Optional[int] = None
    extracted_text: Optional[str] = None
    corrected_text: Optional[str] = None
    created_at: datetime
    method: Optional[str] = None
    message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
