"""Decision Engine API routes."""
from __future__ import annotations

from fastapi import APIRouter

from app.models.schemas import RecommendRequest
from app.services.decision_engine import recommend
from app.utils.sanitize import sanitize_id

router = APIRouter(prefix="/api/v1/decision", tags=["Decision Engine"])


@router.post("/recommend")
async def get_recommendation(req: RecommendRequest):
    """Get smart recommendations based on user zone and intent."""
    return recommend(sanitize_id(req.user_zone), req.intent)
