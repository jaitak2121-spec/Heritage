from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.audit_event import CuratorAuditEvent
from app.schemas.audit import AuditEventResponse
from app.security import CuratorIdentity, require_curator


router = APIRouter(prefix="/api/audit", tags=["Curator Audit"])


@router.get("", response_model=list[AuditEventResponse])
def list_audit_events(
    action: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _curator: CuratorIdentity = Depends(require_curator),
):
    query = db.query(CuratorAuditEvent)
    if action:
        query = query.filter(CuratorAuditEvent.action == action)
    return query.order_by(CuratorAuditEvent.created_at.desc()).offset(skip).limit(limit).all()
