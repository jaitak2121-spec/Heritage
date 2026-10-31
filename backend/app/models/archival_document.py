from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
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
    extracted_text = Column(Text, nullable=True)
    corrected_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    site = relationship("HeritageSite", back_populates="documents")
