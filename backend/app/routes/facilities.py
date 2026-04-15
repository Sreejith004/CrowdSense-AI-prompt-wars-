from fastapi import APIRouter
from app.services import facilities_service

router = APIRouter(prefix="/api/v1/facilities", tags=["facilities"])

@router.get("/water")
async def get_water(stadium: str | None = None):
    """Get all drinking water points, optionally filtered by stadium."""
    return facilities_service.get_water_points(stadium)

@router.get("/water/nearest/{user_zone}")
async def get_nearest_water(user_zone: str):
    """Get the nearest drinking water point to the user."""
    return facilities_service.get_nearest_water(user_zone)
