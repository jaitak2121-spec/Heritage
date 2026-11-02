from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Index, Integer, String, Text

from app.database import Base


class CuratorAuditEvent(Base):
    __tablename__ = "curator_audit_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    actor_type = Column(String(32), nullable=False, default="curator")
    actor_identifier = Column(String(64), nullable=True)
    action = Column(String(100), nullable=False)
    resource_type = Column(String(64), nullable=False)
    resource_id = Column(String(64), nullable=True)
    outcome = Column(String(32), nullable=False, default="success")
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("ix_curator_audit_events_created_at", "created_at"),
        Index("ix_curator_audit_events_action", "action"),
    )
