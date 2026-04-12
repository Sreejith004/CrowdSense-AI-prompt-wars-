"""Crowd density API routes."""
from __future__ import annotations

from fastapi import APIRouter

from app.services.crowd_service import get_crowd_snapshot, get_zone_density

router = APIRouter(prefix="/api/v1/crowd", tags=["Crowd"])


@router.get("/snapshot")
async def snapshot():
    """Get current + predicted crowd density for all zones."""
    return get_crowd_snapshot()


@router.get("/zone/{zone_id}")
async def zone_density(zone_id: str):
    """Get density for a specific zone."""
    return get_zone_density(zone_id)
