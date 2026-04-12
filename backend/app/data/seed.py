"""Seed data for the CrowdSense AI stadium simulation."""
from __future__ import annotations

from app.utils.mock_firestore import db

# ── Stadium Zone Graph ──────────────────────────────────────────────
# Zones represent areas in the stadium; edges represent walkable paths.
ZONES = [
    "A1", "A2", "A3", "A4",
    "B1", "B2", "B3", "B4",
    "C1", "C2", "C3", "C4",
    "GATE_N", "GATE_S", "GATE_E", "GATE_W",
    "EXIT_MAIN", "EXIT_EAST", "EXIT_WEST",
]

EDGES: list[tuple[str, str, float]] = [
    ("GATE_N", "A1", 1.0), ("GATE_N", "A2", 1.0),
    ("GATE_S", "C3", 1.0), ("GATE_S", "C4", 1.0),
    ("GATE_E", "B4", 1.0), ("GATE_E", "A4", 1.2),
    ("GATE_W", "B1", 1.0), ("GATE_W", "C1", 1.2),
    ("A1", "A2", 0.8), ("A2", "A3", 0.8), ("A3", "A4", 0.8),
    ("A1", "B1", 1.0), ("A2", "B2", 1.0), ("A3", "B3", 1.0), ("A4", "B4", 1.0),
    ("B1", "B2", 0.7), ("B2", "B3", 0.7), ("B3", "B4", 0.7),
    ("B1", "C1", 1.0), ("B2", "C2", 1.0), ("B3", "C3", 1.0), ("B4", "C4", 1.0),
    ("C1", "C2", 0.8), ("C2", "C3", 0.8), ("C3", "C4", 0.8),
    ("A1", "EXIT_MAIN", 1.5), ("A4", "EXIT_EAST", 1.5),
    ("C1", "EXIT_WEST", 1.5), ("C4", "EXIT_MAIN", 1.8),
    ("GATE_N", "EXIT_MAIN", 1.2), ("GATE_S", "EXIT_MAIN", 1.4),
    ("GATE_E", "EXIT_EAST", 1.0), ("GATE_W", "EXIT_WEST", 1.0),
]

# Zone display positions for the heatmap (x%, y%)
ZONE_POSITIONS: dict[str, tuple[int, int]] = {
    "GATE_N": (50, 5), "GATE_S": (50, 95), "GATE_E": (95, 50), "GATE_W": (5, 50),
    "A1": (25, 20), "A2": (42, 20), "A3": (58, 20), "A4": (75, 20),
    "B1": (25, 45), "B2": (42, 45), "B3": (58, 45), "B4": (75, 45),
    "C1": (25, 70), "C2": (42, 70), "C3": (58, 70), "C4": (75, 70),
    "EXIT_MAIN": (50, 5), "EXIT_EAST": (95, 30), "EXIT_WEST": (5, 70),
}

# Zone contextual location hints
ZONE_HINTS: dict[str, str] = {
    "A1": "Near Gate North, Section A", "A2": "Beside Food Court Alpha",
    "A3": "Opposite Hallway B-North", "A4": "Near Gate East, Upper Level",
    "B1": "Near Gate West, Central Corridor", "B2": "Central Arena – West Wing",
    "B3": "Central Arena – East Wing", "B4": "Near Gate East, Central",
    "C1": "Near Gate West, Lower Level", "C2": "Beside Merchandise Plaza",
    "C3": "Near Gate South, Entertainment Zone", "C4": "Near Gate South, East Aisle",
    "GATE_N": "Main North Entrance", "GATE_S": "South Entrance",
    "GATE_E": "East Entrance", "GATE_W": "West Entrance",
    "EXIT_MAIN": "Main Exit (North)", "EXIT_EAST": "East Emergency Exit",
    "EXIT_WEST": "West Emergency Exit",
}


# ── Stalls ──────────────────────────────────────────────────────────
STALLS_DATA = [
    {
        "stall_id": "food-1", "name": "Stadium Grill", "category": "food",
        "zone_id": "A2", "location_hint": "Beside Food Court Alpha",
        "menu": [
            {"item_id": "fg1", "name": "Classic Burger", "price": 8.99, "description": "Juicy beef patty with cheese"},
            {"item_id": "fg2", "name": "Loaded Fries", "price": 5.49, "description": "Fries with cheese & bacon"},
            {"item_id": "fg3", "name": "BBQ Wings", "price": 9.99, "description": "Smoky BBQ chicken wings (8pcs)"},
            {"item_id": "fg4", "name": "Veggie Wrap", "price": 7.49, "description": "Grilled veggie tortilla wrap"},
        ],
        "offers": [
            {"offer_id": "of1", "title": "Combo Deal", "description": "Burger + Fries + Drink for $14.99", "combo_price": 14.99, "active": True},
            {"offer_id": "of2", "title": "Happy Hour", "description": "20% off Wings 3-5 PM", "discount_percent": 20, "active": True},
        ],
        "is_open": True,
    },
    {
        "stall_id": "food-2", "name": "Pizza Corner", "category": "food",
        "zone_id": "B2", "location_hint": "Central Arena – West Wing",
        "menu": [
            {"item_id": "pc1", "name": "Margherita Pizza", "price": 10.99, "description": "Classic tomato & mozzarella"},
            {"item_id": "pc2", "name": "Pepperoni Pizza", "price": 12.99, "description": "Loaded pepperoni & cheese"},
            {"item_id": "pc3", "name": "Garlic Bread", "price": 4.99, "description": "Toasted garlic bread with herbs"},
            {"item_id": "pc4", "name": "Soft Drink", "price": 2.99, "description": "Chilled cola / lemon / orange"},
        ],
        "offers": [
            {"offer_id": "of3", "title": "Family Pack", "description": "2 Pizzas + 2 Drinks for $24.99", "combo_price": 24.99, "active": True},
        ],
        "is_open": True,
    },
    {
        "stall_id": "food-3", "name": "Noodle Bar", "category": "food",
        "zone_id": "C3", "location_hint": "Near Gate South, Entertainment Zone",
        "menu": [
            {"item_id": "nb1", "name": "Ramen Bowl", "price": 11.99, "description": "Rich tonkotsu ramen"},
            {"item_id": "nb2", "name": "Pad Thai", "price": 10.49, "description": "Thai stir-fried noodles"},
            {"item_id": "nb3", "name": "Spring Rolls", "price": 5.99, "description": "Crispy vegetable spring rolls"},
            {"item_id": "nb4", "name": "Iced Tea", "price": 3.49, "description": "Freshly brewed iced tea"},
        ],
        "offers": [
            {"offer_id": "of4", "title": "Lunch Special", "description": "Any noodle + drink for $13.49", "combo_price": 13.49, "active": True},
        ],
        "is_open": True,
    },
    {
        "stall_id": "merch-1", "name": "Fan Zone Store", "category": "merchandise",
        "zone_id": "C2", "location_hint": "Beside Merchandise Plaza",
        "menu": [
            {"item_id": "mz1", "name": "Team Jersey", "price": 79.99, "description": "Official replica jersey"},
            {"item_id": "mz2", "name": "Cap", "price": 24.99, "description": "Embroidered team cap"},
            {"item_id": "mz3", "name": "Scarf", "price": 19.99, "description": "Knitted supporter scarf"},
            {"item_id": "mz4", "name": "Foam Finger", "price": 9.99, "description": "#1 foam finger"},
        ],
        "offers": [
            {"offer_id": "of5", "title": "Match Day Offer", "description": "Buy any 2 items, get 15% off", "discount_percent": 15, "active": True},
        ],
        "is_open": True,
    },
    {
        "stall_id": "merch-2", "name": "Sports Collectibles", "category": "merchandise",
        "zone_id": "A3", "location_hint": "Opposite Hallway B-North",
        "menu": [
            {"item_id": "sc1", "name": "Signed Football", "price": 149.99, "description": "Match-used signed ball"},
            {"item_id": "sc2", "name": "Photo Frame Set", "price": 34.99, "description": "Stadium photo frame set"},
            {"item_id": "sc3", "name": "Keychain", "price": 7.99, "description": "Metal team keychain"},
            {"item_id": "sc4", "name": "Poster (A2)", "price": 14.99, "description": "High-res team poster"},
        ],
        "offers": [],
        "is_open": True,
    },
    {
        "stall_id": "ent-1", "name": "AR Experience Zone", "category": "entertainment",
        "zone_id": "B3", "location_hint": "Central Arena – East Wing",
        "menu": [
            {"item_id": "ar1", "name": "AR Stadium Tour", "price": 12.99, "description": "15-min augmented reality tour"},
            {"item_id": "ar2", "name": "VR Goal Challenge", "price": 9.99, "description": "Virtual penalty shootout"},
            {"item_id": "ar3", "name": "Photo Booth", "price": 5.99, "description": "Green screen team photo"},
        ],
        "offers": [
            {"offer_id": "of6", "title": "Experience Bundle", "description": "All 3 activities for $24.99", "combo_price": 24.99, "active": True},
        ],
        "is_open": True,
    },
    {
        "stall_id": "food-4", "name": "Juice & Smoothie Bar", "category": "food",
        "zone_id": "B1", "location_hint": "Near Gate West, Central Corridor",
        "menu": [
            {"item_id": "js1", "name": "Mango Smoothie", "price": 5.99, "description": "Fresh mango blend"},
            {"item_id": "js2", "name": "Berry Blast", "price": 6.49, "description": "Mixed berry smoothie"},
            {"item_id": "js3", "name": "Green Detox", "price": 6.99, "description": "Spinach, apple, ginger"},
            {"item_id": "js4", "name": "Fresh OJ", "price": 4.49, "description": "Freshly squeezed orange juice"},
        ],
        "offers": [
            {"offer_id": "of7", "title": "2 for 1", "description": "Buy 1 smoothie, get 1 free", "discount_percent": 50, "active": True},
        ],
        "is_open": True,
    },
]


# ── Help / Emergency Locations ──────────────────────────────────────
HELP_LOCATIONS = [
    {
        "location_id": "med-1", "name": "Medical Room Alpha", "type": "medical",
        "zone_id": "A1", "description": "Primary medical room near Gate North. Full first-aid & paramedic team.",
        "phone": "+1-555-0101",
    },
    {
        "location_id": "med-2", "name": "Medical Room Beta", "type": "medical",
        "zone_id": "C4", "description": "South-side medical station near Gate South.",
        "phone": "+1-555-0102",
    },
    {
        "location_id": "first-aid-1", "name": "First Aid Point – Central", "type": "first_aid",
        "zone_id": "B2", "description": "Quick first-aid station in the Central Arena west wing.",
        "phone": "+1-555-0103",
    },
    {
        "location_id": "info-1", "name": "Info Desk – North", "type": "info_desk",
        "zone_id": "GATE_N", "description": "Main information desk at North Gate entrance.",
        "phone": "+1-555-0110",
    },
    {
        "location_id": "info-2", "name": "Info Desk – South", "type": "info_desk",
        "zone_id": "GATE_S", "description": "Information desk at South Gate entrance.",
        "phone": "+1-555-0111",
    },
    {
        "location_id": "first-aid-2", "name": "First Aid Point – East", "type": "first_aid",
        "zone_id": "B4", "description": "Quick first-aid station near East Gate.",
        "phone": "+1-555-0104",
    },
]


def seed_database() -> None:
    """Populate the mock Firestore with seed data."""
    stalls_col = db.collection("stalls")
    for stall in STALLS_DATA:
        stalls_col.add(stall["stall_id"], stall)

    help_col = db.collection("help_locations")
    for loc in HELP_LOCATIONS:
        help_col.add(loc["location_id"], loc)

    zones_col = db.collection("zones")
    for zone in ZONES:
        zones_col.add(zone, {
            "zone_id": zone,
            "hint": ZONE_HINTS.get(zone, ""),
            "position": ZONE_POSITIONS.get(zone, (50, 50)),
        })
