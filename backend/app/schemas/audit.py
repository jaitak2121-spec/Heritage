from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class AuditEventResponse(BaseModel):
    id: int
    actor_type: str
    actor_identifier: Optional[str] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    outcome: str
    details: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
