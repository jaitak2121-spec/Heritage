from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, literal_column, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.archival_document import ArchivalDocument
from app.models.heritage_site import HeritageSite
from app.schemas.search import ArchiveSearchResponse, DocumentSearchResult, SiteSearchResult


router = APIRouter(prefix="/api/search", tags=["Archive Search"])


def _search_condition(dialect_name: str, columns: tuple, term: str):
    if dialect_name == "postgresql":
        empty = literal_column("''")
        separator = literal_column("' '")
        document = func.coalesce(columns[0], empty)
        for column in columns[1:]:
            document = document + separator + func.coalesce(column, empty)
        config = literal_column("'simple'")
        return func.to_tsvector(config, document).op("@@")(
            func.websearch_to_tsquery(config, term)
        )
    pattern = f"%{term}%"
    return or_(*(column.ilike(pattern) for column in columns))


def _excerpt(value: str | None, term: str, radius: int = 120) -> str:
    text = " ".join((value or "").split())
    if not text:
        return "No extracted text is available for this document."
    position = text.casefold().find(term.casefold())
    if position < 0:
        return text[: radius * 2] + ("…" if len(text) > radius * 2 else "")
    start = max(0, position - radius)
    end = min(len(text), position + len(term) + radius)
    return ("…" if start else "") + text[start:end] + ("…" if end < len(text) else "")


@router.get("", response_model=ArchiveSearchResponse)
def search_archive(
    q: str = Query(..., min_length=2, max_length=200),
    period: str | None = Query(None),
    style: str | None = Query(None),
    region: str | None = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """Search site metadata and both extracted and curator-corrected document text."""
    term = q.strip()
    dialect_name = db.get_bind().dialect.name
    document_match = _search_condition(
        dialect_name,
        (ArchivalDocument.title, ArchivalDocument.extracted_text, ArchivalDocument.corrected_text),
        term,
    )

    document_query = db.query(ArchivalDocument, HeritageSite.name.label("site_name")).outerjoin(
        HeritageSite, HeritageSite.id == ArchivalDocument.site_id
    ).filter(document_match)
    if period and period.lower() != "all":
        document_query = document_query.filter(HeritageSite.historical_period.ilike(f"%{period}%"))
    if style and style.lower() != "all":
        document_query = document_query.filter(HeritageSite.architectural_style.ilike(f"%{style}%"))
    if region and region.lower() != "all":
        document_query = document_query.filter(HeritageSite.region.ilike(region))
    document_total = document_query.count()
    document_rows = document_query.order_by(ArchivalDocument.created_at.desc()).offset(offset).limit(limit).all()

    matching_site_ids = db.query(ArchivalDocument.site_id).filter(
        document_match, ArchivalDocument.site_id.is_not(None)
    )
    site_metadata_match = _search_condition(
        dialect_name,
        (
            HeritageSite.name, HeritageSite.description, HeritageSite.location_name,
            HeritageSite.historical_period, HeritageSite.architectural_style, HeritageSite.significance,
        ),
        term,
    )
    site_query = db.query(HeritageSite).filter(or_(
        site_metadata_match,
        HeritageSite.id.in_(matching_site_ids),
    ))
    if period and period.lower() != "all":
        site_query = site_query.filter(HeritageSite.historical_period.ilike(f"%{period}%"))
    if style and style.lower() != "all":
        site_query = site_query.filter(HeritageSite.architectural_style.ilike(f"%{style}%"))
    if region and region.lower() != "all":
        site_query = site_query.filter(HeritageSite.region.ilike(region))
    site_total = site_query.count()
    sites = site_query.order_by(HeritageSite.name).offset(offset).limit(limit).all()

    document_counts: dict[int, int] = {}
    for document, _ in document_rows:
        if document.site_id:
            document_counts[document.site_id] = document_counts.get(document.site_id, 0) + 1

    site_results = [SiteSearchResult(
        id=site.id, title=site.name, location_name=site.location_name,
        historical_period=site.historical_period, architectural_style=site.architectural_style,
        region=site.region, description=site.description, image_url=site.image_url,
        matching_document_count=document_counts.get(site.id, 0),
    ) for site in sites]
    document_results = [DocumentSearchResult(
        id=document.id, site_id=document.site_id, site_name=site_name, title=document.title,
        excerpt=_excerpt(document.corrected_text or document.extracted_text, term),
        processing_status=document.processing_status, review_status=document.review_status,
    ) for document, site_name in document_rows]
    return ArchiveSearchResponse(
        query=term, sites=site_results, documents=document_results,
        total=site_total + document_total, site_total=site_total, document_total=document_total,
        offset=offset, limit=limit,
        has_more=(offset + len(site_results) < site_total or offset + len(document_results) < document_total),
    )
