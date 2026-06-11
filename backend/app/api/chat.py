import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.auth import _get_current_user
from app.database import get_db
from app.models.konwersacje import Conversation
from app.models.user import User
from app.schemas.chat import ChatRequest, ChatResponse, ConversationResponse
from app.services import chat as chat_service

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
def send_message(
    body: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(_get_current_user),
):
    reply, conv_id, messages = chat_service.chat(
        db, current_user.id, body.message, body.conversation_id
    )
    return ChatResponse(
        conversation_id=conv_id,
        reply=reply,
        messages=[{"role": m["role"], "content": m["content"]} for m in messages],
    )


@router.get("/conversations", response_model=list[ConversationResponse])
def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(_get_current_user),
):
    stmt = (
        select(Conversation)
        .where(Conversation.user_id == current_user.id)
        .order_by(Conversation.created_at.desc())
    )
    return list(db.execute(stmt).scalars().all())
