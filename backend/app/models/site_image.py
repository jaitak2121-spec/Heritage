from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class SiteImage(Base):
    __tablename__ = "site_images"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    site_id = Column(Integer, ForeignKey("heritage_sites.id", ondelete="CASCADE"), nullable=False, index=True)
    image_url = Column(String(1024), nullable=False)
    caption = Column(String(255), nullable=True)

    # Relationships
    site = relationship("HeritageSite", back_populates="images")
