from typing import List, Optional
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.database import get_db
from app.models.heritage_site import HeritageSite
from app.models.archival_document import ArchivalDocument
from app.models.site_image import SiteImage
from app.schemas.site import (
    HeritageSiteCreate,
    HeritageSiteUpdate,
    HeritageSiteListResponse,
    HeritageSiteDetailResponse,
)
from app.security import CuratorIdentity, require_curator
from app.services.storage import StorageConfigurationError, StorageOperationError, get_document_storage
from app.services.audit import add_audit_event

router = APIRouter(prefix="/api/sites", tags=["Heritage Sites"])


@router.get("", response_model=List[HeritageSiteListResponse])
def get_sites(
    q: Optional[str] = Query(None, description="Search across title, location, description, or style"),
    search: Optional[str] = Query(None, description="Alternate search parameter"),
    period: Optional[str] = Query(None, description="Filter by historical period"),
    style: Optional[str] = Query(None, description="Filter by architectural style"),
    region: Optional[str] = Query(None, description="Filter by region (North, South, East, West, Central)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Search and filter cultural heritage sites with document and image counts.
    """
    query = db.query(
        HeritageSite,
        func.count(ArchivalDocument.id.distinct()).label("doc_count"),
        func.count(SiteImage.id.distinct()).label("img_count"),
    ).outerjoin(ArchivalDocument, ArchivalDocument.site_id == HeritageSite.id)\
     .outerjoin(SiteImage, SiteImage.site_id == HeritageSite.id)\
     .group_by(HeritageSite.id)

    search_term = None
    if isinstance(q, str) and q.strip():
        search_term = q.strip()
    elif isinstance(search, str) and search.strip():
        search_term = search.strip()

    if search_term:
        s = f"%{search_term}%"
        query = query.filter(
            or_(
                HeritageSite.name.ilike(s),
                HeritageSite.location_name.ilike(s),
                HeritageSite.description.ilike(s),
                HeritageSite.architectural_style.ilike(s),
                ArchivalDocument.title.ilike(s),
                ArchivalDocument.extracted_text.ilike(s),
                ArchivalDocument.corrected_text.ilike(s),
            )
        )

    if isinstance(period, str) and period.lower() != "all":
        query = query.filter(HeritageSite.historical_period.ilike(f"%{period}%"))

    if isinstance(style, str) and style.lower() != "all":
        query = query.filter(HeritageSite.architectural_style.ilike(f"%{style}%"))

    if isinstance(region, str) and region.lower() != "all":
        query = query.filter(HeritageSite.region.ilike(region))

    skip_val = skip if isinstance(skip, int) else 0
    limit_val = limit if isinstance(limit, int) else 50
    results = query.offset(skip_val).limit(limit_val).all()

    response = []
    for site, doc_count, img_count in results:
        site_dict = {
            "id": site.id,
            "name": site.name,
            "description": site.description,
            "historical_period": site.historical_period,
            "architectural_style": site.architectural_style,
            "region": site.region,
            "location_name": site.location_name,
            "latitude": site.latitude,
            "longitude": site.longitude,
            "image_url": site.image_url,
            "significance": site.significance,
            "sources": site.sources,
            "created_at": site.created_at,
            "document_count": doc_count,
            "image_count": img_count,
        }
        response.append(HeritageSiteListResponse(**site_dict))

    return response


@router.get("/{site_id}", response_model=HeritageSiteDetailResponse)
def get_site(site_id: int, db: Session = Depends(get_db)):
    """
    Retrieve full heritage site record with associated archival documents and gallery images.
    """
    site = db.query(HeritageSite).filter(HeritageSite.id == site_id).first()
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Heritage site with ID {site_id} not found."
        )
    return site


@router.post("", response_model=HeritageSiteDetailResponse, status_code=status.HTTP_201_CREATED)
def create_site(site_in: HeritageSiteCreate, db: Session = Depends(get_db),
                _curator: CuratorIdentity = Depends(require_curator)):
    """
    Create a new heritage site record.
    """
    new_site = HeritageSite(**site_in.model_dump())
    db.add(new_site)
    db.flush()
    add_audit_event(db, action="site.create", resource_type="heritage_site", resource_id=new_site.id)
    db.commit()
    db.refresh(new_site)
    return new_site


@router.put("/{site_id}", response_model=HeritageSiteDetailResponse)
def update_site(site_id: int, site_in: HeritageSiteUpdate, db: Session = Depends(get_db),
                _curator: CuratorIdentity = Depends(require_curator)):
    """
    Update an existing heritage site record.
    """
    site = db.query(HeritageSite).filter(HeritageSite.id == site_id).first()
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Heritage site with ID {site_id} not found."
        )

    update_data = site_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(site, field, value)

    add_audit_event(
        db, action="site.update", resource_type="heritage_site", resource_id=site.id,
        details={"fields": sorted(update_data)},
    )
    db.commit()
    db.refresh(site)
    return site


@router.delete("/{site_id}", status_code=status.HTTP_200_OK)
def delete_site(site_id: int, db: Session = Depends(get_db),
                _curator: CuratorIdentity = Depends(require_curator)):
    """
    Delete a heritage site and its cascading documents and images.
    """
    site = db.query(HeritageSite).filter(HeritageSite.id == site_id).first()
    if not site:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Heritage site with ID {site_id} not found."
        )

    # A database cascade cannot remove durable objects. Refuse the destructive
    # operation if any associated object cannot be cleaned up.
    try:
        for document in site.documents:
            if document.storage_key:
                get_document_storage(document.storage_provider).delete(document.storage_key)
            elif document.file_path and Path(document.file_path).is_file():
                Path(document.file_path).unlink()
    except (OSError, StorageConfigurationError, StorageOperationError) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Associated document cleanup failed; the site and database records were preserved.",
        ) from exc

    add_audit_event(db, action="site.delete", resource_type="heritage_site", resource_id=site.id)
    db.delete(site)
    db.commit()
    return {"message": "Heritage site deleted successfully", "id": site_id}
