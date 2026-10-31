from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


# Site Image Schemas
class SiteImageBase(BaseModel):
    image_url: str
    caption: Optional[str] = None


class SiteImageCreate(SiteImageBase):
    pass


class SiteImageResponse(SiteImageBase):
    id: int
    site_id: int

    model_config = ConfigDict(from_attributes=True)


# Archival Document Schemas
class ArchivalDocumentBase(BaseModel):
    title: str
    file_type: str
    original_filename: Optional[str] = None
    extracted_text: Optional[str] = None
    corrected_text: Optional[str] = None


class ArchivalDocumentCreate(ArchivalDocumentBase):
    site_id: Optional[int] = None


class ArchivalDocumentResponse(ArchivalDocumentBase):
    id: int
    site_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Heritage Site Schemas
class HeritageSiteBase(BaseModel):
    name: str
    description: str
    historical_period: str
    architectural_style: str
    region: str
    location_name: str
    latitude: float
    longitude: float
    image_url: str
    significance: Optional[str] = None
    sources: Optional[str] = None


class HeritageSiteCreate(HeritageSiteBase):
    pass


class HeritageSiteUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    historical_period: Optional[str] = None
    architectural_style: Optional[str] = None
    region: Optional[str] = None
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    image_url: Optional[str] = None
    significance: Optional[str] = None
    sources: Optional[str] = None


# Brief response for list views
class HeritageSiteListResponse(HeritageSiteBase):
    id: int
    created_at: Optional[datetime] = None
    document_count: Optional[int] = 0
    image_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)


# Detailed response with nested documents and gallery images
class HeritageSiteDetailResponse(HeritageSiteBase):
    id: int
    created_at: Optional[datetime] = None
    documents: List[ArchivalDocumentResponse] = []
    images: List[SiteImageResponse] = []

    model_config = ConfigDict(from_attributes=True)


# Map Marker Schema
class MapMarkerResponse(BaseModel):
    id: int
    name: str
    description: str
    historical_period: str
    architectural_style: str
    region: str
    location_name: str
    latitude: float
    longitude: float
    image_url: str

    model_config = ConfigDict(from_attributes=True)
