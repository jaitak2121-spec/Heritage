from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.heritage_site import HeritageSite
from app.schemas.site import MapMarkerResponse

router = APIRouter(prefix="/api/map", tags=["Geospatial Map"])


@router.get("/markers", response_model=List[MapMarkerResponse])
def get_map_markers(db: Session = Depends(get_db)):
    """
    Retrieve all surveyed heritage sites with geographic coordinates and metadata for map rendering.
    """
    sites = db.query(
        HeritageSite.id,
        HeritageSite.name,
        HeritageSite.description,
        HeritageSite.historical_period,
        HeritageSite.architectural_style,
        HeritageSite.region,
        HeritageSite.location_name,
        HeritageSite.latitude,
        HeritageSite.longitude,
        HeritageSite.image_url,
    ).all()

    return [
        MapMarkerResponse(
            id=s.id,
            name=s.name,
            description=s.description,
            historical_period=s.historical_period,
            architectural_style=s.architectural_style,
            region=s.region,
            location_name=s.location_name,
            latitude=s.latitude,
            longitude=s.longitude,
            image_url=s.image_url,
        )
        for s in sites
    ]
