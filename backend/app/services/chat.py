import uuid
from typing import Any

from langchain.chat_models import init_chat_model
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.konwersacje import Conversation

SYSTEM_PROMPT = """Jesteś asystentem restauracji. Pomagasz klientom:
- wybrać dania z menu
- odpowiedzieć na pytania o składniki
- przyjąć zamówienie (przekierowując do systemu zamówień)
- odpowiedzieć na pytania o godzin otwarcia, adres itp.

Menu restauracji zawiera dania kuchni polskiej: schabowy, pierogi, placki ziemniaczane,
zupy (rosół, pomidorowa), desery (szarlotka, naleśniki), napoje.

Bądź pomocny, uprzejmy i odpowiadaj po polsku."""


def _get_llm():
    """Initialize the LLM (DeepSeek via OpenAI-compatible API)."""
    if settings.deepseek_api_key:
        return init_chat_model(
            "deepseek-chat",
            model_provider="openai",
            api_key=settings.deepseek_api_key,
            base_url="https://api.deepseek.com/v1",
        )
    return None


def chat(
    db: Session,
    user_id: uuid.UUID,
    message: str,
    conversation_id: uuid.UUID | None = None,
) -> tuple[str, uuid.UUID, list[dict[str, Any]]]:
    """Process a chat message. Returns (reply, conversation_id, all_messages)."""

    # Get or create conversation
    if conversation_id:
        conv = db.execute(
            select(Conversation).where(
                Conversation.id == conversation_id, Conversation.user_id == user_id
            )
        ).scalar_one_or_none()
        if conv is None:
            conversation_id = None

    if conversation_id is None:
        conv = Conversation(user_id=user_id, messages=[])
        db.add(conv)
        db.flush()

    # Add user message
    messages = list(conv.messages) if conv.messages else []
    messages.append({"role": "user", "content": message})

    # Try to get AI response
    llm = _get_llm()
    if llm:
        try:
            langchain_messages = [SystemMessage(content=SYSTEM_PROMPT)]
            for msg in messages:
                if msg["role"] == "user":
                    langchain_messages.append(HumanMessage(content=msg["content"]))
                else:
                    langchain_messages.append(AIMessage(content=msg["content"]))
            ai_response = llm.invoke(langchain_messages)
            reply = ai_response.content
        except Exception:
            reply = (
                "Przepraszam, asystent AI nie jest dostępny. "
                "Wystąpił błąd połączenia z API DeepSeek."
            )
    else:
        reply = (
            "Przepraszam, asystent AI nie jest dostępny. "
            "Skonfiguruj klucz API DeepSeek w ustawieniach serwera."
        )

    # Save AI response
    messages.append({"role": "assistant", "content": reply})
    conv.messages = messages
    db.commit()

    return reply, conv.id, messages
