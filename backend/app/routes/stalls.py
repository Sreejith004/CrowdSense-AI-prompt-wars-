"""Stalls & Help API routes."""
from __future__ import annotations

from fastapi import APIRouter

from app.data.seed import STALLS_DATA, HELP_LOCATIONS

router = APIRouter(prefix="/api/v1", tags=["Stalls & Help"])


@router.get("/stalls")
async def list_stalls(category: str | None = None):
    """List all stalls, optionally filtered by category."""
    if category:
        return [s for s in STALLS_DATA if s["category"] == category]
    return STALLS_DATA


@router.get("/stalls/{stall_id}")
async def get_stall(stall_id: str):
    """Get a specific stall."""
    for s in STALLS_DATA:
        if s["stall_id"] == stall_id:
            return s
    return {"error": "Stall not found"}


@router.get("/help")
async def list_help():
    """List all help / emergency locations."""
    return HELP_LOCATIONS


@router.get("/help/{location_type}")
async def help_by_type(location_type: str):
    """Filter help locations by type (medical, first_aid, info_desk)."""
    return [h for h in HELP_LOCATIONS if h["type"] == location_type]


@router.get("/zones")
async def list_zones():
    """List all zones with position data."""
    from app.data.seed import ZONES, ZONE_POSITIONS, ZONE_HINTS
    return [
        {
            "zone_id": z,
            "position": ZONE_POSITIONS.get(z, (50, 50)),
            "hint": ZONE_HINTS.get(z, ""),
        }
        for z in ZONES
    ]
