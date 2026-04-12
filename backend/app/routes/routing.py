"""Routing API routes."""
from __future__ import annotations

from fastapi import APIRouter

from app.models.schemas import RouteRequest
from app.services.routing_service import dijkstra, find_best_exit
from app.utils.sanitize import sanitize_id

router = APIRouter(prefix="/api/v1/routing", tags=["Routing"])


@router.post("/find")
async def find_route(req: RouteRequest):
    """Find optimal route between two zones."""
    origin = sanitize_id(req.origin)
    destination = sanitize_id(req.destination)
    return dijkstra(origin, destination)


@router.get("/exit/{user_zone}")
async def best_exit(user_zone: str):
    """Find the best (least congested) exit from a zone."""
    return find_best_exit(sanitize_id(user_zone))
