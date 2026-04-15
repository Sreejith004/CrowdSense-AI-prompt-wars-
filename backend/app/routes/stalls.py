"""Stalls & Help API routes."""
from __future__ import annotations

from fastapi import APIRouter

from app.data.seed import STALLS_DATA, HELP_LOCATIONS, STADIUMS

router = APIRouter(prefix="/api/v1", tags=["Stalls & Help"])


@router.get("/stadiums")
async def list_stadiums():
    """List all available stadiums."""
    return STADIUMS


@router.get("/stalls")
async def list_stalls(category: str | None = None, stadium: str | None = None):
    """List all stalls, optionally filtered by category and stadium."""
    data = STALLS_DATA
    if stadium:
        data = [s for s in data if s.get("stadium_id") == stadium]
    if category:
        data = [s for s in data if s["category"] == category]
    return data


@router.get("/stalls/{stall_id}")
async def get_stall(stall_id: str):
    """Get a specific stall."""
    for s in STALLS_DATA:
        if s["stall_id"] == stall_id:
            return s
    return {"error": "Stall not found"}


@router.get("/help")
async def list_help(stadium: str | None = None):
    """List all help / emergency locations, optionally filtered by stadium."""
    if stadium:
        return [h for h in HELP_LOCATIONS if h.get("stadium_id") == stadium]
    return HELP_LOCATIONS


@router.get("/help/{location_type}")
async def help_by_type(location_type: str, stadium: str | None = None):
    """Filter help locations by type and stadium."""
    data = HELP_LOCATIONS
    if stadium:
        data = [h for h in data if h.get("stadium_id") == stadium]
    return [h for h in data if h["type"] == location_type]


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
