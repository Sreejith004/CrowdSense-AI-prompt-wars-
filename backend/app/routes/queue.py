"""Queue & Orders API routes."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models.schemas import CreateOrderRequest
from app.services.queue_service import (
    create_order,
    get_all_queues,
    get_order,
    get_queue_info,
    get_stall_orders,
    toggle_stall_orders,
    update_order_status,
)
from app.utils.sanitize import sanitize_id

router = APIRouter(prefix="/api/v1/queue", tags=["Queue & Orders"])


@router.get("/all")
async def all_queues(stadium: str | None = None):
    """Get queue info for all stalls (filtered by stadium if provided)."""
    return get_all_queues(stadium)


@router.get("/stall/{stall_id}")
async def stall_queue(stall_id: str):
    """Get queue info for a specific stall."""
    return get_queue_info(sanitize_id(stall_id))


@router.post("/order")
async def place_order(req: CreateOrderRequest):
    """Place a new order (joins the virtual queue)."""
    items = [item.model_dump() for item in req.items]
    result = create_order(
        sanitize_id(req.stall_id), 
        items, 
        req.user_name, 
        req.user_id, 
        req.discount_applied,
        req.stadium_name,
        req.match_name
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/user-orders/{user_id}")
async def user_orders(user_id: str):
    """Get all orders for a specific user."""
    from app.services.queue_service import get_user_orders
    return get_user_orders(sanitize_id(user_id))


@router.get("/order/{order_id}")
async def order_status(order_id: str):
    """Get order details."""
    order = get_order(sanitize_id(order_id))
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.patch("/order/{order_id}/status")
async def change_order_status(order_id: str, status: str):
    """Update order status."""
    valid = {"pending", "preparing", "ready", "collected", "cancelled"}
    if status not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status. Use: {valid}")
    result = update_order_status(sanitize_id(order_id), status)
    if not result:
        raise HTTPException(status_code=404, detail="Order not found")
    return result


@router.post("/stall/{stall_id}/toggle")
async def toggle_orders(stall_id: str, accepting: bool = True):
    """Pause or resume orders for a stall."""
    return toggle_stall_orders(sanitize_id(stall_id), accepting)


@router.get("/stall/{stall_id}/orders")
async def stall_orders(stall_id: str):
    """List all orders for a stall."""
    return get_stall_orders(sanitize_id(stall_id))
