import uuid
from datetime import datetime

from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    conversation_id: uuid.UUID | None = None
    message: str


class ChatResponse(BaseModel):
    conversation_id: uuid.UUID
    reply: str
    messages: list[ChatMessage]


class ConversationResponse(BaseModel):
    id: uuid.UUID
    messages: list[ChatMessage]
    created_at: datetime

    model_config = {"from_attributes": True}
