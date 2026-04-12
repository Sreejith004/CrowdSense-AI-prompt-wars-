"""Crowd density simulation and prediction service.

Uses NumPy-only linear regression for lightweight predictions.
"""
from __future__ import annotations

import time
from typing import Any

import numpy as np

from app.data.seed import ZONES, ZONE_HINTS
from app.utils.cache import cache
from app.utils.logger import get_logger

log = get_logger("crowd_service")

# ── History buffer for regression ────────────────────────────────────
_HISTORY_SIZE = 20
_density_history: dict[str, list[float]] = {z: [] for z in ZONES}
_time_steps: list[float] = []


def _simulate_density(zone_id: str, t: float) -> float:
    """Generate realistic crowd-density value in [0, 1]."""
    np.random.seed(int(abs(hash(zone_id + str(int(t)))) % 2**31))
    base = 0.3
    # Gates are generally busier
    if "GATE" in zone_id:
        base = 0.55
    elif "EXIT" in zone_id:
        base = 0.25
    # Add periodic wave + noise
    wave = 0.2 * np.sin(t / 60 + hash(zone_id) % 10)
    noise = np.random.uniform(-0.1, 0.1)
    return float(np.clip(base + wave + noise, 0.0, 1.0))


def _linear_predict(history: list[float], steps_ahead: int = 3) -> float:
    """Simple linear regression prediction using NumPy."""
    if len(history) < 3:
        return history[-1] if history else 0.3
    y = np.array(history[-_HISTORY_SIZE:])
    x = np.arange(len(y), dtype=float)
    n = len(y)
    x_mean, y_mean = x.mean(), y.mean()
    slope = (np.sum(x * y) - n * x_mean * y_mean) / (np.sum(x**2) - n * x_mean**2 + 1e-9)
    intercept = y_mean - slope * x_mean
    predicted = slope * (n - 1 + steps_ahead) + intercept
    return float(np.clip(predicted, 0.0, 1.0))


def get_crowd_snapshot() -> dict[str, Any]:
    """Return current + predicted density for every zone."""
    cached = cache.get("crowd_snapshot")
    if cached:
        return cached

    t = time.time()
    _time_steps.append(t)

    zones_data = []
    for zone_id in ZONES:
        current = _simulate_density(zone_id, t)
        _density_history[zone_id].append(current)
        predicted = _linear_predict(_density_history[zone_id])
        cap = 1000 if "GATE" in zone_id else 200 if "EXIT" in zone_id else 500
        headcount = int(current * cap)
        zones_data.append({
            "zone_id": zone_id,
            "current_density": round(current, 3),
            "predicted_density": round(predicted, 3),
            "label": ZONE_HINTS.get(zone_id, ""),
            "headcount": headcount,
        })

    snapshot = {"timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"), "zones": zones_data}
    cache.set("crowd_snapshot", snapshot, ttl=5)
    return snapshot


def get_zone_density(zone_id: str) -> dict[str, float]:
    """Get density for a specific zone."""
    snapshot = get_crowd_snapshot()
    for z in snapshot["zones"]:
        if z["zone_id"] == zone_id:
            return {"current": z["current_density"], "predicted": z["predicted_density"]}
    return {"current": 0.3, "predicted": 0.3}
