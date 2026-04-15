"""Pydantic schemas for CrowdSense AI."""
from __future__ import annotations

from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


# ── Auth ─────────────────────────────────────────────────────────────
class AuthMode(str, Enum):
    PASSWORD = "password"
    OTP = "otp"


class LoginRequest(BaseModel):
    identifier: str  # mobile or email
    password: Optional[str] = None
    otp: Optional[str] = None
    mode: AuthMode = AuthMode.PASSWORD


class SignupRequest(BaseModel):
    identifier: str
    password: str
    confirm_password: str


class ForgotPasswordRequest(BaseModel):
    identifier: str


class ResetPasswordRequest(BaseModel):
    identifier: str
    reset_code: str
    new_password: str


# ── Crowd ────────────────────────────────────────────────────────────
class ZoneDensity(BaseModel):
    zone_id: str
    current_density: float = Field(ge=0, le=1)
    predicted_density: float = Field(ge=0, le=1)
    label: str = ""
    headcount: int = 0


class CrowdSnapshot(BaseModel):
    timestamp: str
    zones: list[ZoneDensity]


# ── Routing ──────────────────────────────────────────────────────────
class RouteRequest(BaseModel):
    origin: str
    destination: str


class RouteStep(BaseModel):
    zone_id: str
    density: float


class RouteResponse(BaseModel):
    origin: str
    destination: str
    path: list[str]
    total_cost: float
    steps: list[RouteStep]


# ── Queue / Orders ───────────────────────────────────────────────────
class OrderStatus(str, Enum):
    PENDING = "pending"
    PREPARING = "preparing"
    READY = "ready"
    COLLECTED = "collected"
    CANCELLED = "cancelled"


class OrderItem(BaseModel):
    item_id: str
    name: str
    quantity: int = Field(ge=1)
    price: float = Field(ge=0)


class CreateOrderRequest(BaseModel):
    stall_id: str
    items: list[OrderItem]
    user_name: str = "Guest"
    user_id: Optional[str] = None
    discount_applied: float = 0
    stadium_name: Optional[str] = None
    match_name: Optional[str] = None


class OrderResponse(BaseModel):
    order_id: str
    token_number: int
    stall_id: str
    stall_name: str
    items: list[OrderItem]
    total: float
    status: OrderStatus
    refund_status: str = "none"  # none, requested, refunded
    user_id: Optional[str] = None
    estimated_wait_minutes: float
    queue_position: int


class QueueInfo(BaseModel):
    stall_id: str
    stall_name: str
    queue_length: int
    online_queue_length: int = 0
    offline_queue_length: int = 0
    estimated_wait_minutes: float
    is_accepting_orders: bool


# ── Stalls ───────────────────────────────────────────────────────────
class MenuItem(BaseModel):
    item_id: str
    name: str
    price: float
    description: str = ""
    available: bool = True


class Offer(BaseModel):
    offer_id: str
    title: str
    description: str
    discount_percent: float = 0
    combo_price: float | None = None
    active: bool = True


class StallCategory(str, Enum):
    FOOD = "food"
    MERCHANDISE = "merchandise"
    ENTERTAINMENT = "entertainment"


class Stall(BaseModel):
    stall_id: str
    name: str
    category: StallCategory
    zone_id: str
    location_hint: str = ""
    menu: list[MenuItem] = []
    offers: list[Offer] = []
    is_open: bool = True


# ── Help / Emergency ────────────────────────────────────────────────
class HelpLocation(BaseModel):
    location_id: str
    name: str
    type: str  # medical, info_desk, first_aid
    zone_id: str
    description: str
    phone: str = ""


# ── Decision Engine ─────────────────────────────────────────────────
class RecommendRequest(BaseModel):
    user_zone: str
    intent: str = "general"  # general, food, exit, medical


class Recommendation(BaseModel):
    type: str
    title: str
    description: str
    route: list[str] | None = None
    extra: dict[str, Any] = {}


class RecommendResponse(BaseModel):
    recommendations: list[Recommendation]
    context: dict[str, Any] = {}


# ── Assistant ────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    message: str
    user_zone: Optional[str] = "A1"
    lang: str = "en"


class ChatResponse(BaseModel):
    reply: str
    intent: str
    suggestions: list[str] = []
    data: dict[str, Any] = {}
