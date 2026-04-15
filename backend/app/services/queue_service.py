"""Queue & ordering service – virtual queue, wait-time prediction, order management."""
from __future__ import annotations

import time
import uuid
from typing import Any

from app.data.seed import STALLS_DATA
from app.utils.logger import get_logger
from app.utils.mock_firestore import db

log = get_logger("queue_service")

# In-memory order queue per stall
_queues: dict[str, list[dict[str, Any]]] = {}
_token_counter: dict[str, int] = {}
_stall_accepting: dict[str, bool] = {}


def _init_stall(stall_id: str) -> None:
    if stall_id not in _queues:
        _queues[stall_id] = []
        _token_counter[stall_id] = 0
        _stall_accepting[stall_id] = True

def _advance_order_status(stall_id: str) -> None:
    now = time.time()
    for order in _queues.get(stall_id, []):
        elapsed = now - order["created_at"]
        if order["status"] == "pending" and elapsed > 15:
            order["status"] = "preparing"
            db.collection("orders").document(order["order_id"]).update({"status": "preparing"})
        elif order["status"] == "preparing" and elapsed > 35:
            order["status"] = "ready"
            db.collection("orders").document(order["order_id"]).update({"status": "ready"})


def estimate_wait_minutes(stall_id: str) -> float:
    """Predict wait time based on queue length and time-of-day variation."""
    _init_stall(stall_id)
    active = [o for o in _queues[stall_id] if o["status"] in ("pending", "preparing")]
    offline_count = (abs(hash(stall_id)) % 6) + 2
    queue_len = len(active) + offline_count
    base_per_order = 3.0  # minutes
    hour = time.localtime().tm_hour
    # Peak-hour multiplier
    if 12 <= hour <= 14 or 18 <= hour <= 20:
        multiplier = 1.4
    else:
        multiplier = 1.0
    return round(queue_len * base_per_order * multiplier, 1)


def create_order(stall_id: str, items: list[dict], user_name: str = "Guest", user_id: str | None = None, discount_applied: float = 0, stadium_name: str | None = None, match_name: str | None = None) -> dict[str, Any]:
    """Place an order and join the virtual queue."""
    _init_stall(stall_id)

    if not _stall_accepting.get(stall_id, True):
        return {"error": "Stall is currently not accepting orders."}

    stall_name = stall_id
    for s in STALLS_DATA:
        if s["stall_id"] == stall_id:
            stall_name = s["name"]
            break

    _token_counter[stall_id] += 1
    order_id = str(uuid.uuid4())[:8]
    total = sum(item["price"] * item["quantity"] for item in items)
    total = max(0.0, total - discount_applied)

    order = {
        "order_id": order_id,
        "token_number": _token_counter[stall_id],
        "stall_id": stall_id,
        "stall_name": stall_name,
        "items": items,
        "total": round(total, 2),
        "status": "pending",
        "refund_status": "none",
        "user_name": user_name,
        "user_id": user_id,
        "stadium_name": stadium_name,
        "match_name": match_name,
        "created_at": time.time(),
    }
    _queues[stall_id].append(order)

    queue_pos = len([o for o in _queues[stall_id] if o["status"] in ("pending", "preparing")])
    order["estimated_wait_minutes"] = estimate_wait_minutes(stall_id)
    order["queue_position"] = queue_pos

    # Persist to mock Firestore
    db.collection("orders").add(order_id, order)
    log.info("Order %s created for stall %s (token #%d) by user %s", order_id, stall_id, order["token_number"], user_id)
    return order


def update_order_status(order_id: str, new_status: str) -> dict[str, Any] | None:
    """Update order status (preparing / ready / collected / cancelled)."""
    for stall_id, stall_orders in _queues.items():
        _advance_order_status(stall_id)
        for order in stall_orders:
            if order["order_id"] == order_id:
                # Cancellation rule: Allow ONLY when status is "pending"
                if new_status == "cancelled" and order["status"] != "pending":
                    return {"error": "Only pending orders can be cancelled."}
                
                order["status"] = new_status
                db.collection("orders").document(order_id).update({"status": new_status})
                log.info("Order %s → %s", order_id, new_status)
                return order
    return None


def get_user_orders(user_id: str) -> list[dict[str, Any]]:
    """Retrieve all orders for a specific user across all stalls."""
    all_orders = []
    # Force status advance for all stalls first
    for stall_id in _queues:
        _advance_order_status(stall_id)
    
    # Collect from in-memory queues (or mock DB)
    for stall_orders in _queues.values():
        for order in stall_orders:
            if order.get("user_id") == user_id:
                all_orders.append(order)
    
    # Sort by created_at descending
    all_orders.sort(key=lambda x: x["created_at"], reverse=True)
    return all_orders


def get_order(order_id: str) -> dict[str, Any] | None:
    """Retrieve a single order."""
    for stall_id, stall_orders in _queues.items():
        _advance_order_status(stall_id)
        for order in stall_orders:
            if order["order_id"] == order_id:
                return order
    return None


def get_queue_info(stall_id: str) -> dict[str, Any]:
    """Get queue status for a stall."""
    _init_stall(stall_id)
    _advance_order_status(stall_id)
    stall_name = stall_id
    for s in STALLS_DATA:
        if s["stall_id"] == stall_id:
            stall_name = s["name"]
            break
    active = [o for o in _queues[stall_id] if o["status"] in ("pending", "preparing")]
    online_count = len(active)
    offline_count = (abs(hash(stall_id)) % 6) + 2
    return {
        "stall_id": stall_id,
        "stall_name": stall_name,
        "queue_length": online_count + offline_count,
        "online_queue_length": online_count,
        "offline_queue_length": offline_count,
        "estimated_wait_minutes": estimate_wait_minutes(stall_id),
        "is_accepting_orders": _stall_accepting.get(stall_id, True),
    }


def get_all_queues(stadium_id: str | None = None) -> list[dict[str, Any]]:
    """Queue info for all stalls, optionally filtered by stadium."""
    results = []
    for s in STALLS_DATA:
        if stadium_id and s.get("stadium_id") != stadium_id:
            continue
        results.append(get_queue_info(s["stall_id"]))
    return results


def toggle_stall_orders(stall_id: str, accepting: bool) -> dict[str, Any]:
    """Pause or resume orders for a stall."""
    _init_stall(stall_id)
    _stall_accepting[stall_id] = accepting
    return {"stall_id": stall_id, "is_accepting_orders": accepting}


def get_stall_orders(stall_id: str) -> list[dict[str, Any]]:
    """Get all orders for a stall."""
    _init_stall(stall_id)
    _advance_order_status(stall_id)
    return _queues[stall_id]
