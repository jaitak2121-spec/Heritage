from typing import Literal, Optional

from pydantic import BaseModel


class SiteSearchResult(BaseModel):
    type: Literal["site"] = "site"
    id: int
    title: str
    location_name: str
    historical_period: str
    architectural_style: str
    region: str
    description: str
    image_url: str
    matching_document_count: int = 0


class DocumentSearchResult(BaseModel):
    type: Literal["document"] = "document"
    id: int
    site_id: Optional[int] = None
    site_name: Optional[str] = None
    title: str
    excerpt: str
    processing_status: str
    review_status: str


class ArchiveSearchResponse(BaseModel):
    query: str
    sites: list[SiteSearchResult]
    documents: list[DocumentSearchResult]
    total: int
    site_total: int
    document_total: int
    offset: int
    limit: int
    has_more: bool
