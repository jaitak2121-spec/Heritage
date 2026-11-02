import hashlib
import json
import logging
from typing import Any

from sqlalchemy.orm import Session

from app.models.audit_event import CuratorAuditEvent


logger = logging.getLogger("heritagelens.audit")


def anonymize_actor(value: str | None) -> str | None:
    if not value:
        return None
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:16]


def add_audit_event(
    db: Session,
    *,
    action: str,
    resource_type: str,
    resource_id: int | str | None = None,
    outcome: str = "success",
    actor_type: str = "curator",
    actor_identifier: str | None = None,
    details: dict[str, Any] | None = None,
) -> CuratorAuditEvent:
    event = CuratorAuditEvent(
        actor_type=actor_type,
        actor_identifier=anonymize_actor(actor_identifier),
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id is not None else None,
        outcome=outcome,
        details=json.dumps(details, separators=(",", ":"), sort_keys=True) if details else None,
    )
    db.add(event)
    return event


def record_standalone_audit_event(db: Session, **kwargs: Any) -> None:
    """Best-effort audit for authentication events that have no business transaction."""
    try:
        add_audit_event(db, **kwargs)
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Could not persist curator authentication audit event")
