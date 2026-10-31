import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.assistant import ChatRequest, ChatResponse
from app.services.assistant import answer_heritage_query

logger = logging.getLogger("heritagelens.assistant_router")

router = APIRouter(prefix="/api/assistant", tags=["AI Heritage Assistant"])


@router.post("/chat", response_model=ChatResponse, status_code=status.HTTP_200_OK)
def chat_with_assistant(
    payload: ChatRequest,
    db: Session = Depends(get_db),
):
    """
    Inquire into India's cultural and architectural heritage.
    Answers are synthesized strictly from SQLite heritage sites and archival documents
    using Omnirouter AI or direct archive synthesis if API credentials are unconfigured.
    """
    question = payload.question.strip()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty.",
        )

    conversation_id = payload.conversation_id or str(uuid.uuid4())
    logger.info(f"Processing inquiry for session '{conversation_id[:8]}...': {question[:60]}")

    response = answer_heritage_query(
        question=question,
        conversation_id=conversation_id,
        db=db,
    )
    return response
