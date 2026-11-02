from datetime import datetime, timezone
from sqlalchemy import Column, Float, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class ArchivalDocument(Base):
    __tablename__ = "archival_documents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    site_id = Column(Integer, ForeignKey("heritage_sites.id", ondelete="CASCADE"), nullable=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    file_type = Column(String(50), nullable=False)
    original_filename = Column(String(255), nullable=True)
    file_path = Column(String(500), nullable=True)
    file_size = Column(Integer, nullable=True)
    storage_provider = Column(String(32), nullable=False, default="local", index=True)
    storage_key = Column(String(1024), nullable=True, unique=True)
    extracted_text = Column(Text, nullable=True)
    corrected_text = Column(Text, nullable=True)
    processing_status = Column(String(32), nullable=False, default="uploaded", index=True)
    review_status = Column(String(32), nullable=False, default="unreviewed", index=True)
    ocr_method = Column(String(64), nullable=True)
    extraction_language = Column(String(32), nullable=True)
    page_count = Column(Integer, nullable=True)
    ocr_confidence = Column(Float, nullable=True)
    processing_error = Column(Text, nullable=True)
    processing_started_at = Column(DateTime, nullable=True)
    processing_completed_at = Column(DateTime, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    site = relationship("HeritageSite", back_populates="documents")

    @property
    def file_url(self) -> str | None:
        """Expose only the authorized API route, never a storage path or credential."""
        return f"/api/documents/{self.id}/download" if self.id and (self.storage_key or self.file_path) else None
