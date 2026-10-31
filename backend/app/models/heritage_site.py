from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base


class HeritageSite(Base):
    __tablename__ = "heritage_sites"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=False)
    historical_period = Column(String(100), nullable=False, index=True)
    architectural_style = Column(String(100), nullable=False, index=True)
    region = Column(String(50), nullable=False, index=True)
    location_name = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    image_url = Column(String(1024), nullable=False)
    significance = Column(Text, nullable=True)
    sources = Column(Text, nullable=True)  # JSON-encoded array or newline-separated citations
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    documents = relationship("ArchivalDocument", back_populates="site", cascade="all, delete-orphan")
    images = relationship("SiteImage", back_populates="site", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_site_search", "name", "region", "historical_period"),
    )
