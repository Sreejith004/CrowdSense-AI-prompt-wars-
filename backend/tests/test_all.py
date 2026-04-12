"""Tests for CrowdSense AI services and routes."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


# ══════════════════════════════════════════════════════════════════
# HEALTH
# ══════════════════════════════════════════════════════════════════
class TestHealth:
    def test_health_check(self):
        res = client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert data["service"] == "CrowdSense AI"


# ══════════════════════════════════════════════════════════════════
# CROWD SERVICE
# ══════════════════════════════════════════════════════════════════
class TestCrowd:
    def test_snapshot_returns_zones(self):
        res = client.get("/api/v1/crowd/snapshot")
        assert res.status_code == 200
        data = res.json()
        assert "zones" in data
        assert len(data["zones"]) > 0
        zone = data["zones"][0]
        assert "zone_id" in zone
        assert 0 <= zone["current_density"] <= 1
        assert 0 <= zone["predicted_density"] <= 1

    def test_zone_density(self):
        res = client.get("/api/v1/crowd/zone/A1")
        assert res.status_code == 200
        data = res.json()
        assert "current" in data
        assert "predicted" in data


# ══════════════════════════════════════════════════════════════════
# ROUTING SERVICE
# ══════════════════════════════════════════════════════════════════
class TestRouting:
    def test_find_route(self):
        res = client.post("/api/v1/routing/find", json={"origin": "A1", "destination": "C4"})
        assert res.status_code == 200
        data = res.json()
        assert "path" in data
        assert len(data["path"]) > 0
        assert data["path"][0] == "A1"
        assert data["path"][-1] == "C4"
        assert data["total_cost"] > 0

    def test_find_route_same_zone(self):
        res = client.post("/api/v1/routing/find", json={"origin": "B2", "destination": "B2"})
        assert res.status_code == 200
        data = res.json()
        assert data["path"] == ["B2"]
        assert data["total_cost"] == 0

    def test_best_exit(self):
        res = client.get("/api/v1/routing/exit/B2")
        assert res.status_code == 200
        data = res.json()
        assert "path" in data
        assert len(data["path"]) > 0
        # Last node should be an exit
        assert data["path"][-1].startswith("EXIT")


# ══════════════════════════════════════════════════════════════════
# QUEUE SERVICE
# ══════════════════════════════════════════════════════════════════
class TestQueue:
    def test_all_queues(self):
        res = client.get("/api/v1/queue/all")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_stall_queue(self):
        res = client.get("/api/v1/queue/stall/food-1")
        assert res.status_code == 200
        data = res.json()
        assert data["stall_id"] == "food-1"
        assert "queue_length" in data

    def test_place_and_get_order(self):
        order_data = {
            "stall_id": "food-1",
            "items": [{"item_id": "fg1", "name": "Classic Burger", "quantity": 2, "price": 8.99}],
            "user_name": "TestUser",
        }
        res = client.post("/api/v1/queue/order", json=order_data)
        assert res.status_code == 200
        order = res.json()
        assert "order_id" in order
        assert order["token_number"] > 0
        assert order["total"] == pytest.approx(17.98)
        assert order["status"] == "pending"

        # Retrieve order
        res2 = client.get(f"/api/v1/queue/order/{order['order_id']}")
        assert res2.status_code == 200
        assert res2.json()["order_id"] == order["order_id"]

    def test_update_order_status(self):
        # First create an order
        order_data = {
            "stall_id": "food-2",
            "items": [{"item_id": "pc1", "name": "Margherita Pizza", "quantity": 1, "price": 10.99}],
        }
        res = client.post("/api/v1/queue/order", json=order_data)
        order = res.json()

        # Update status
        res2 = client.patch(f"/api/v1/queue/order/{order['order_id']}/status?status=preparing")
        assert res2.status_code == 200
        assert res2.json()["status"] == "preparing"

    def test_toggle_stall(self):
        res = client.post("/api/v1/queue/stall/food-1/toggle?accepting=false")
        assert res.status_code == 200
        assert res.json()["is_accepting_orders"] is False

        # Re-enable
        res2 = client.post("/api/v1/queue/stall/food-1/toggle?accepting=true")
        assert res2.json()["is_accepting_orders"] is True


# ══════════════════════════════════════════════════════════════════
# DECISION ENGINE
# ══════════════════════════════════════════════════════════════════
class TestDecisionEngine:
    def test_general_recommendation(self):
        res = client.post("/api/v1/decision/recommend", json={"user_zone": "B2", "intent": "general"})
        assert res.status_code == 200
        data = res.json()
        assert "recommendations" in data
        assert len(data["recommendations"]) > 0
        assert "context" in data

    def test_food_recommendation(self):
        res = client.post("/api/v1/decision/recommend", json={"user_zone": "A1", "intent": "food"})
        assert res.status_code == 200
        recs = res.json()["recommendations"]
        food_recs = [r for r in recs if r["type"] == "food"]
        assert len(food_recs) > 0

    def test_exit_recommendation(self):
        res = client.post("/api/v1/decision/recommend", json={"user_zone": "C3", "intent": "exit"})
        assert res.status_code == 200
        recs = res.json()["recommendations"]
        exit_recs = [r for r in recs if r["type"] == "exit"]
        assert len(exit_recs) > 0

    def test_medical_recommendation(self):
        res = client.post("/api/v1/decision/recommend", json={"user_zone": "B3", "intent": "medical"})
        assert res.status_code == 200
        recs = res.json()["recommendations"]
        med_recs = [r for r in recs if r["type"] == "medical"]
        assert len(med_recs) > 0


# ══════════════════════════════════════════════════════════════════
# AI ASSISTANT
# ══════════════════════════════════════════════════════════════════
class TestAssistant:
    def test_greeting(self):
        res = client.post("/api/v1/assistant/chat", json={"message": "Hello!", "user_zone": "A1"})
        assert res.status_code == 200
        data = res.json()
        assert data["intent"] == "greeting"
        assert len(data["reply"]) > 0

    def test_food_query(self):
        res = client.post("/api/v1/assistant/chat", json={"message": "Where can I find food?", "user_zone": "B2"})
        assert res.status_code == 200
        assert res.json()["intent"] == "food"

    def test_exit_query(self):
        res = client.post("/api/v1/assistant/chat", json={"message": "Navigate to exit", "user_zone": "C1"})
        assert res.status_code == 200
        assert res.json()["intent"] == "exit"

    def test_medical_query(self):
        res = client.post("/api/v1/assistant/chat", json={"message": "Nearest medical help?", "user_zone": "B3"})
        assert res.status_code == 200
        assert res.json()["intent"] == "medical"

    def test_offers_query(self):
        res = client.post("/api/v1/assistant/chat", json={"message": "Show food stalls with offers", "user_zone": "A2"})
        assert res.status_code == 200
        assert res.json()["intent"] == "offers"

    def test_crowd_query(self):
        res = client.post("/api/v1/assistant/chat", json={"message": "How busy is it here?", "user_zone": "B1"})
        assert res.status_code == 200
        assert res.json()["intent"] == "crowd"

    def test_where_query(self):
        res = client.post("/api/v1/assistant/chat", json={"message": "Where am I?", "user_zone": "C2"})
        assert res.status_code == 200
        assert res.json()["intent"] == "where"

    def test_queue_query(self):
        res = client.post("/api/v1/assistant/chat", json={"message": "How long is the wait?", "user_zone": "A1"})
        assert res.status_code == 200
        assert res.json()["intent"] == "queue"


# ══════════════════════════════════════════════════════════════════
# STALLS & HELP
# ══════════════════════════════════════════════════════════════════
class TestStallsAndHelp:
    def test_list_stalls(self):
        res = client.get("/api/v1/stalls")
        assert res.status_code == 200
        assert len(res.json()) > 0

    def test_filter_stalls_by_category(self):
        res = client.get("/api/v1/stalls?category=food")
        assert res.status_code == 200
        for s in res.json():
            assert s["category"] == "food"

    def test_get_stall(self):
        res = client.get("/api/v1/stalls/food-1")
        assert res.status_code == 200
        assert res.json()["stall_id"] == "food-1"

    def test_list_help(self):
        res = client.get("/api/v1/help")
        assert res.status_code == 200
        assert len(res.json()) > 0

    def test_help_by_type(self):
        res = client.get("/api/v1/help/medical")
        assert res.status_code == 200
        for h in res.json():
            assert h["type"] == "medical"

    def test_list_zones(self):
        res = client.get("/api/v1/zones")
        assert res.status_code == 200
        assert len(res.json()) > 0


# ══════════════════════════════════════════════════════════════════
# PREDICTION (unit tests)
# ══════════════════════════════════════════════════════════════════
class TestPrediction:
    def test_linear_predict_basics(self):
        from app.services.crowd_service import _linear_predict
        # Increasing trend
        history = [0.1, 0.2, 0.3, 0.4, 0.5]
        pred = _linear_predict(history)
        assert pred > 0.5  # should predict higher

    def test_linear_predict_decreasing(self):
        from app.services.crowd_service import _linear_predict
        history = [0.9, 0.8, 0.7, 0.6, 0.5]
        pred = _linear_predict(history)
        assert pred < 0.5  # should predict lower

    def test_linear_predict_short_history(self):
        from app.services.crowd_service import _linear_predict
        pred = _linear_predict([0.5])
        assert pred == 0.5

    def test_linear_predict_empty(self):
        from app.services.crowd_service import _linear_predict
        pred = _linear_predict([])
        assert pred == 0.3  # default


# ══════════════════════════════════════════════════════════════════
# INPUT SANITIZATION
# ══════════════════════════════════════════════════════════════════
class TestSanitization:
    def test_sanitize_text(self):
        from app.utils.sanitize import sanitize_text
        assert sanitize_text("  hello <script>  ") == "hello script"

    def test_sanitize_id(self):
        from app.utils.sanitize import sanitize_id
        assert sanitize_id("food-1") == "food-1"
        assert sanitize_id("foo<bar>") == "foobar"

    def test_sanitize_text_max_length(self):
        from app.utils.sanitize import sanitize_text
        result = sanitize_text("a" * 1000, max_length=50)
        assert len(result) == 50


# ══════════════════════════════════════════════════════════════════
# CACHE
# ══════════════════════════════════════════════════════════════════
class TestCache:
    def test_set_and_get(self):
        from app.utils.cache import TTLCache
        c = TTLCache(default_ttl=10)
        c.set("key1", "value1")
        assert c.get("key1") == "value1"

    def test_expired(self):
        from app.utils.cache import TTLCache
        c = TTLCache(default_ttl=0)
        c.set("key2", "value2", ttl=0)
        import time; time.sleep(0.01)
        assert c.get("key2") is None

    def test_invalidate(self):
        from app.utils.cache import TTLCache
        c = TTLCache()
        c.set("key3", "value3")
        c.invalidate("key3")
        assert c.get("key3") is None
