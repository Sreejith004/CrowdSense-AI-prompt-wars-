"""AI Assistant – rule-based NLP with intent detection and context awareness."""
from __future__ import annotations

import re
from typing import Any

from app.data.seed import STALLS_DATA, HELP_LOCATIONS, ZONE_HINTS
from app.services.crowd_service import get_zone_density
from app.services.decision_engine import recommend
from app.services.queue_service import get_queue_info
from app.services.routing_service import dijkstra, find_best_exit
from app.utils.logger import get_logger

log = get_logger("assistant_service")

# ── Intent patterns ─────────────────────────────────────────────────
INTENT_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("navigate",    re.compile(r"navigate|route|go to|how.*get|direction|path", re.I)),
    ("exit",        re.compile(r"exit|leave|way out|get out", re.I)),
    ("food",        re.compile(r"food|eat|hungry|restaurant|stall|pizza|burger|noodle|drink|juice|smoothie", re.I)),
    ("medical",     re.compile(r"medical|doctor|help|emergency|first.?aid|nurse|injured|hurt", re.I)),
    ("queue",       re.compile(r"queue|wait|order|token|line|how long", re.I)),
    ("offers",      re.compile(r"offer|deal|discount|promo|combo|sale", re.I)),
    ("merchandise", re.compile(r"merch|jersey|cap|souvenir|shop|buy|store|collectible", re.I)),
    ("entertainment", re.compile(r"entertainment|fun|game|ar |vr |photo|experience", re.I)),
    ("crowd",       re.compile(r"crowd|busy|density|packed|empty|quiet", re.I)),
    ("info",        re.compile(r"info|information|desk|lost|found", re.I)),
    ("where",       re.compile(r"where.*(?:am i|is)|location|zone", re.I)),
    ("greeting",    re.compile(r"^(hi|hello|hey|howdy|sup|greetings)", re.I)),
]


def detect_intent(message: str) -> str:
    for intent, pattern in INTENT_PATTERNS:
        if pattern.search(message):
            return intent
    return "general"


def _extract_zone(message: str) -> str | None:
    """Try to extract a zone ID from the message."""
    match = re.search(r"\b([A-C][1-4]|GATE_[NSEW]|EXIT_\w+)\b", message, re.I)
    if match:
        return match.group(1).upper()
    return None


import json
import os

# ── Translation System ──────────────────────────────────────────────
_TRANSLATIONS: dict[str, Any] = {}

def _load_translations():
    global _TRANSLATIONS
    try:
        # Resolve path to frontend/translations.json
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        path = os.path.join(base_dir, "..", "frontend", "translations.json")
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                _TRANSLATIONS = json.load(f)
    except Exception as e:
        log.error(f"Failed to load translations: {e}")

_load_translations()

def _t(key: str, lang: str = "en") -> str:
    """Helper to translate strings using the global dictionary."""
    return _TRANSLATIONS.get(lang, {}).get(key, key)

def _tr(key: str, lang: str = "en") -> str:
    """Helper to get assistant-specific templates."""
    replies = _TRANSLATIONS.get(lang, {}).get("assistant_replies", {})
    return replies.get(key, _TRANSLATIONS.get("en", {}).get("assistant_replies", {}).get(key, key))

def handle_message(message: str, user_zone: str = "A1", lang: str = "en") -> dict[str, Any]:
    """Process a user chat message and return a context-aware reply in the chosen language."""
    intent = detect_intent(message)
    log.info("Intent: %s | Zone: %s | Lang: %s | Message: %s", intent, user_zone, lang, message[:80])

    reply = ""
    suggestions: list[str] = []
    data: dict[str, Any] = {}

    if intent == "greeting":
        density = get_zone_density(user_zone)
        level_key = "moderate"
        if density["current"] > 0.7:
            level_key = "busy"
        elif density["current"] < 0.3:
            level_key = "quiet"
        
        level = _tr(level_key, lang)
        hint = _t(ZONE_HINTS.get(user_zone, ""), lang)
        
        reply = _tr("greeting", lang).format(zone=user_zone, level=level) + "\n\n" + _tr("ask_help", lang)
        suggestions = ["Find food", "Navigate to exit", "Show offers", "Nearest medical help"]

    elif intent == "navigate":
        target = _extract_zone(message)
        if target:
            route = dijkstra(user_zone, target)
            reply = _tr("nav_path", lang).format(origin=user_zone, target=target) + "\n"
            reply += f"Path: {' → '.join(route['path'])}\n"
            reply += _tr("cost", lang).format(cost=route['total_cost'])
            data = {"route": route}
        else:
            reply = _tr("where_to", lang)
            suggestions = ["Navigate to GATE_N", "Navigate to B2", "Exit stadium"]

    elif intent == "exit":
        route = find_best_exit(user_zone)
        if route.get("path"):
            reply = _tr("exit_best", lang).format(zone=user_zone) + "\n"
            reply += _tr("exit_path", lang).format(path=' → '.join(route['path'])) + "\n"
            reply += f"Exit: **{route['path'][-1]}** (" + _tr("cost", lang).format(cost=route['total_cost']) + ")"
            data = {"route": route}
        else:
            reply = _tr("no_exit", lang)

    elif intent == "food":
        rec = recommend(user_zone, "food")
        food_recs = [r for r in rec["recommendations"] if r["type"] == "food"]
        if food_recs:
            r = food_recs[0]
            reply = f"**{_t(r['title'], lang)}**\n{_t(r['description'], lang)}\n\nRoute: {' → '.join(r.get('route', []))}"
            data = {"recommendation": r}
            suggestions = ["Order food", "Show more food stalls", "Show offers"]
        else:
            reply = "No food stalls are currently open." # Should be localized but food intent is usually triggered by specific stall names
            # For simplicity using a default from EN if not in templates

    elif intent == "medical":
        rec = recommend(user_zone, "medical")
        med_recs = [r for r in rec["recommendations"] if r["type"] == "medical"]
        if med_recs:
            r = med_recs[0]
            phone = r.get("extra", {}).get("phone", "")
            reply = f"**{_t(r['title'], lang)}**\n{_t(r['description'], lang)}"
            if phone:
                reply += f"\n📞 Call: {phone}"
            reply += f"\n\nRoute: {' → '.join(r.get('route', []))}"
            data = {"recommendation": r}
        else:
            reply = "Emergency? Head to the nearest gate."
        suggestions = ["Navigate to first aid", "Call emergency"]

    elif intent == "queue":
        stalls_info = []
        for s in STALLS_DATA:
            if s["category"] == "food":
                q = get_queue_info(s["stall_id"])
                stalls_info.append(q)
        stalls_info.sort(key=lambda x: x["estimated_wait_minutes"])
        lines = [_tr("queue_status", lang) + "\n"]
        for q in stalls_info:
            status = "✅ " + _t("queue_open", lang) if q["is_accepting_orders"] else "⏸️ " + _t("queue_paused", lang)
            lines.append(f"• **{_t(q['stall_name'], lang)}** – {q['queue_length']} {_t('queue_in_queue', lang)}, ~{q['estimated_wait_minutes']} {_t('queue_wait', lang)} ({status})")
        reply = "\n".join(lines)
        data = {"queues": stalls_info}

    elif intent == "offers":
        lines = [_tr("active_offers", lang) + "\n"]
        for s in STALLS_DATA:
            active_offers = [o for o in s.get("offers", []) if o.get("active")]
            if active_offers:
                lines.append(f"**{_t(s['name'], lang)}** ({_t(s['location_hint'], lang)}):")
                for o in active_offers:
                    price_info = ""
                    curr = _t("currency", lang)
                    if o.get("combo_price"):
                        price_info = f" – {curr}{o['combo_price']}"
                    elif o.get("discount_percent"):
                        price_info = f" – {o['discount_percent']}{_t('offer_off', lang)}"
                    lines.append(f"  • {_t(o['title'], lang)}: {_t(o['description'], lang)}{price_info}")
        reply = "\n".join(lines) if len(lines) > 1 else _tr("no_offers", lang)

    elif intent == "merchandise":
        merch = [s for s in STALLS_DATA if s["category"] == "merchandise"]
        lines = [_tr("merch_stalls", lang) + "\n"]
        for s in merch:
            route = dijkstra(user_zone, s["zone_id"])
            lines.append(f"**{_t(s['name'], lang)}** – Zone {s['zone_id']} ({_t(s['location_hint'], lang)})")
            lines.append(f"  Route: {' → '.join(route.get('path', []))}")
        reply = "\n".join(lines)

    elif intent == "entertainment":
        ent = [s for s in STALLS_DATA if s["category"] == "entertainment"]
        lines = [_tr("ent_title", lang) + "\n"]
        for s in ent:
            route = dijkstra(user_zone, s["zone_id"])
            lines.append(f"**{_t(s['name'], lang)}** – Zone {s['zone_id']} ({_t(s['location_hint'], lang)})")
            for item in s.get("menu", []):
                curr = _t("currency", lang)
                lines.append(f"  • {_t(item['name'], lang)} – {curr}{item['price']}: {_t(item['description'], lang)}")
            lines.append(f"  Route: {' → '.join(route.get('path', []))}")
        reply = "\n".join(lines)

    elif intent == "crowd":
        density = get_zone_density(user_zone)
        level_key = "low"
        if density["current"] > 0.7:
            level_key = "busy"
        elif density["current"] > 0.4:
            level_key = "moderate"
        
        predicted_key = "increasing" if density["predicted"] > density["current"] else "decreasing"
        reply = _tr("crowd_status", lang).format(zone=user_zone) + "\n"
        reply += _tr("current", lang).format(level=_t(level_key, lang), density=f"{density['current']:.0%}") + "\n"
        reply += _tr("trend", lang).format(trend=_tr(predicted_key, lang), pred=f"{density['predicted']:.0%}")
        
    elif intent == "where":
        hint = _t(ZONE_HINTS.get(user_zone, "Unknown area"), lang)
        reply = _tr("where_am_i", lang).format(zone=user_zone, hint=hint)

    elif intent == "info":
        info_desks = [h for h in HELP_LOCATIONS if h["type"] == "info_desk"]
        lines = [_tr("info_desks", lang) + "\n"]
        for loc in info_desks:
            route = dijkstra(user_zone, loc["zone_id"])
            lines.append(f"**{_t(loc['name'], lang)}** – {_t(loc['description'], lang)}")
            lines.append(f"  📞 {loc['phone']} | Route: {' → '.join(route.get('path', []))}")
        reply = "\n".join(lines)

    else:
        rec = recommend(user_zone, "general")
        lines = [_tr("suggestions_intro", lang) + "\n"]
        for r in rec["recommendations"]:
            lines.append(f"• {_t(r['title'], lang)}: {_t(r['description'], lang)}")
        reply = "\n".join(lines)

    # Localize suggestions if they match common keys
    suggestions = [_t(s, lang) for s in suggestions]

    return {
        "reply": reply,
        "intent": intent,
        "suggestions": suggestions,
        "data": data,
    }
