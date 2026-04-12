"""Routing service – Dijkstra with hybrid density weights."""
from __future__ import annotations

import heapq
from typing import Any

from app.data.seed import EDGES, ZONES
from app.services.crowd_service import get_crowd_snapshot
from app.utils.cache import cache
from app.utils.logger import get_logger

log = get_logger("routing_service")

# Build adjacency list from seed edges
_ADJ: dict[str, list[tuple[str, float]]] = {z: [] for z in ZONES}
for u, v, base_w in EDGES:
    _ADJ[u].append((v, base_w))
    _ADJ[v].append((u, base_w))

EXIT_ZONES = ["EXIT_MAIN", "EXIT_EAST", "EXIT_WEST"]


def _build_density_map() -> dict[str, dict[str, float]]:
    snapshot = get_crowd_snapshot()
    return {
        z["zone_id"]: {"current": z["current_density"], "predicted": z["predicted_density"]}
        for z in snapshot["zones"]
    }


def dijkstra(origin: str, destination: str) -> dict[str, Any]:
    """Dijkstra shortest path with hybrid crowd-density weights.

    weight = base_distance + 0.6 * current_density + 0.4 * predicted_density
    """
    cache_key = f"route:{origin}:{destination}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    density = _build_density_map()

    dist: dict[str, float] = {z: float("inf") for z in ZONES}
    prev: dict[str, str | None] = {z: None for z in ZONES}
    dist[origin] = 0.0
    pq: list[tuple[float, str]] = [(0.0, origin)]

    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]:
            continue
        if u == destination:
            break
        for v, base_w in _ADJ.get(u, []):
            cd = density.get(v, {}).get("current", 0.3)
            pd = density.get(v, {}).get("predicted", 0.3)
            w = base_w + 0.6 * cd + 0.4 * pd
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                prev[v] = u
                heapq.heappush(pq, (dist[v], v))

    # Reconstruct path
    path: list[str] = []
    node: str | None = destination
    while node is not None:
        path.append(node)
        node = prev[node]
    path.reverse()

    if path[0] != origin:
        return {"origin": origin, "destination": destination, "path": [], "total_cost": -1, "steps": []}

    steps = [
        {"zone_id": z, "density": density.get(z, {}).get("current", 0)}
        for z in path
    ]

    result = {
        "origin": origin,
        "destination": destination,
        "path": path,
        "total_cost": round(dist[destination], 3),
        "steps": steps,
    }
    cache.set(cache_key, result, ttl=10)
    return result


def find_best_exit(user_zone: str) -> dict[str, Any]:
    """Find the exit with the least congested path."""
    best = None
    for exit_zone in EXIT_ZONES:
        route = dijkstra(user_zone, exit_zone)
        if route["total_cost"] < 0:
            continue
        if best is None or route["total_cost"] < best["total_cost"]:
            best = route
    return best or {"path": [], "total_cost": -1, "message": "No exit path found"}
