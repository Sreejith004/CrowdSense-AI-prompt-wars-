"""AI Assistant API routes."""
from __future__ import annotations

from fastapi import APIRouter

from app.models.schemas import ChatMessage
from app.services.assistant_service import handle_message
from app.utils.sanitize import sanitize_text

router = APIRouter(prefix="/api/v1/assistant", tags=["AI Assistant"])


@router.post("/chat")
async def chat(msg: ChatMessage):
    """Chat with the AI assistant."""
    clean_msg = sanitize_text(msg.message)
    zone = msg.user_zone or "A1"
    return handle_message(clean_msg, zone, msg.lang)
