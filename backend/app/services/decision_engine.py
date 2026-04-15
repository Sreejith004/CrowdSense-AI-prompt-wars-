"""Decision engine – combines crowd, routing, and queue data for smart recommendations."""
from __future__ import annotations

from typing import Any

from app.data.seed import STALLS_DATA, HELP_LOCATIONS
from app.services.crowd_service import get_crowd_snapshot
from app.services.queue_service import get_queue_info
from app.services.routing_service import dijkstra, find_best_exit
from app.utils.logger import get_logger

log = get_logger("decision_engine")


def recommend(user_zone: str, intent: str = "general") -> dict[str, Any]:
    """Produce smart recommendations based on user intent and live data."""
    recommendations: list[dict[str, Any]] = []
    snapshot = get_crowd_snapshot()
    zone_density = {z["zone_id"]: z for z in snapshot["zones"]}

    if intent in ("general", "food"):
        # Find best food stall (least queue + reasonable route)
        food_stalls = [s for s in STALLS_DATA if s["category"] == "food" and s["is_open"]]
        scored: list[tuple[float, dict]] = []
        for stall in food_stalls:
            q = get_queue_info(stall["stall_id"])
            route = dijkstra(user_zone, stall["zone_id"])
            score = q["estimated_wait_minutes"] * 0.5 + route.get("total_cost", 10) * 0.5
            scored.append((score, {**stall, "queue": q, "route": route}))
        scored.sort(key=lambda x: x[0])

        if scored:
            best = scored[0][1]
            recommendations.append({
                "type": "food",
                "title_key": "rec_food_title",
                "title_data": {"name": best["name"]},
                "desc_key": "rec_food_desc",
                "desc_data": {
                    "wait": best["queue"]["estimated_wait_minutes"],
                    "zone": best["zone_id"],
                    "hint": best["location_hint"],
                    "offers": [o["title"] for o in best["offers"] if o.get("active")]
                },
                "route": best["route"].get("path", []),
                "extra": {"stall_id": best["stall_id"], "queue": best["queue"]},
            })

    if intent in ("general", "exit"):
        exit_route = find_best_exit(user_zone)
        recommendations.append({
            "type": "exit",
            "title_key": "rec_exit_title",
            "title_data": {},
            "desc_key": "rec_exit_desc",
            "desc_data": {
                "destination": exit_route.get("path", ["N/A"])[-1] if exit_route.get("path") else "N/A",
                "cost": exit_route.get("total_cost", "N/A")
            },
            "route": exit_route.get("path", []),
            "extra": {},
        })

    if intent in ("general", "medical"):
        medical = [h for h in HELP_LOCATIONS if h["type"] in ("medical", "first_aid")]
        best_med = None
        best_cost = float("inf")
        for loc in medical:
            route = dijkstra(user_zone, loc["zone_id"])
            cost = route.get("total_cost", float("inf"))
            if 0 <= cost < best_cost:
                best_cost = cost
                best_med = {**loc, "route": route}
        if best_med:
            recommendations.append({
                "type": "medical",
                "title_key": "rec_medical_title",
                "title_data": {"name": best_med["name"]},
                "desc_key": "rec_medical_desc",
                "desc_data": {
                    "desc": best_med["description"],
                    "zone": best_med["zone_id"]
                },
                "route": best_med["route"].get("path", []),
                "extra": {"phone": best_med.get("phone", "")},
            })

    # Current zone info
    cz = zone_density.get(user_zone, {})
    context = {
        "user_zone": user_zone,
        "zone_density": cz.get("current_density", 0),
        "zone_predicted": cz.get("predicted_density", 0),
        "zone_hint": cz.get("label", ""),
    }

    return {"recommendations": recommendations, "context": context}
