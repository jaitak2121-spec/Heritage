from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.security import authenticate_curator, login_rate_limiter
from app.services.audit import record_standalone_audit_event


router = APIRouter(prefix="/api/auth", tags=["Curator Authentication"])


class CuratorLoginRequest(BaseModel):
    password: str = Field(min_length=1, max_length=512)


class CuratorLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/login", response_model=CuratorLoginResponse)
def login(payload: CuratorLoginRequest, request: Request, db: Session = Depends(get_db)):
    identifier = request.client.host if request.client else "unknown"
    login_rate_limiter.check(identifier)
    try:
        token = authenticate_curator(payload.password)
    except HTTPException as exc:
        if exc.status_code == status.HTTP_401_UNAUTHORIZED:
            login_rate_limiter.record_failure(identifier)
            record_standalone_audit_event(
                db, action="curator.login", resource_type="session", outcome="failure",
                actor_type="anonymous", actor_identifier=identifier,
            )
        raise

    login_rate_limiter.clear(identifier)
    record_standalone_audit_event(
        db, action="curator.login", resource_type="session", outcome="success",
        actor_identifier=identifier,
    )
    return CuratorLoginResponse(access_token=token)
