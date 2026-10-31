from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class SourceReference(BaseModel):
    id: int
    type: str  # "site" | "document"
    title: str
    citation: Optional[str] = None
    location: Optional[str] = None
    url: str

    model_config = ConfigDict(from_attributes=True)


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000, description="User question about Indian cultural heritage")
    conversation_id: Optional[str] = Field(None, description="Client session or conversation identifier")


class ChatResponse(BaseModel):
    answer: str
    conversation_id: str
    sources: List[SourceReference] = []
    mode: str = "omnirouter_ai"  # "omnirouter_ai" | "archive_fallback"
    provider_status: str = "operational"  # "operational" | "unconfigured" | "error"
    warning: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
