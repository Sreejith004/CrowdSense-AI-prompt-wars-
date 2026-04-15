from __future__ import annotations
from typing import Any
from app.services.routing_service import dijkstra
from app.data.seed import ZONES

WATER_POINTS = [
    {"id": "w1", "stadium_id": "Chepauk", "name": "Pure Splash", "zone": "A2", "nearby_landmark": "Near Gate North"},
    {"id": "w2", "stadium_id": "Wankhede", "name": "Aqua Central", "zone": "B2", "nearby_landmark": "Beside Food Court Alpha"},
    {"id": "w3", "stadium_id": "NarendraModi", "name": "East Hydration", "zone": "B4", "nearby_landmark": ""},
    {"id": "w4", "stadium_id": "Chepauk", "name": "South Sip", "zone": "C3", "nearby_landmark": "Near Gate South"},
]

def get_water_points(stadium: str | None = None) -> list[dict[str, Any]]:
    if stadium:
        return [p for p in WATER_POINTS if p.get("stadium_id") == stadium]
    return WATER_POINTS

def get_nearest_water(user_zone: str) -> dict[str, Any]:
    # Fallback logic
    if user_zone not in ZONES:
        user_zone = "A1"
    
    best_point = None
    min_cost = float("inf")
    
    for point in WATER_POINTS:
        route = dijkstra(user_zone, point["zone"])
        if 0 <= route["total_cost"] < min_cost:
            min_cost = route["total_cost"]
            best_point = point
            
    return best_point or WATER_POINTS[0]
