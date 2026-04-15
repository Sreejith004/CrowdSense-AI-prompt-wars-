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


# ── Stadiums ────────────────────────────────────────────────────────
STADIUMS = [
    {"id": "Chepauk", "name": "Chepauk Stadium", "city": "Chennai", "capacity": 50000},
    {"id": "Wankhede", "name": "Wankhede Stadium", "city": "Mumbai", "capacity": 33000},
    {"id": "NarendraModi", "name": "Narendra Modi Stadium", "city": "Ahmedabad", "capacity": 132000},
]

# ── Stalls ──────────────────────────────────────────────────────────
STALLS_DATA = [
    {
        "stall_id": "food-1", "stadium_id": "Chepauk", "name": "Stadium Grill", "category": "food",
        "zone_id": "A2", "location_hint": "Beside Food Court Alpha",
        "menu": [
            {"item_id": "fg1", "name": "Classic Burger", "price": 8.99, "description": "Juicy beef patty with cheese"},
            {"item_id": "fg2", "name": "Loaded Fries", "price": 5.49, "description": "Fries with cheese & bacon"},
            {"item_id": "fg3", "name": "Chicken Wrap", "price": 7.49, "description": "spicy chicken with lettuce"},
            {"item_id": "fg4", "name": "Onion Rings", "price": 4.99, "description": "Crispy golden onion rings"},
        ],
        "offers": [{"offer_id": "of1", "title": "Combo Deal", "description": "Burger + Fries + Drink for $14.99", "combo_price": 14.99, "active": True}],
        "is_open": True,
    },
    {
        "stall_id": "food-2", "stadium_id": "Chepauk", "name": "Pizza Point", "category": "food",
        "zone_id": "B2", "location_hint": "Central Arena – West Wing",
        "menu": [
            {"item_id": "pc1", "name": "Margherita Pizza", "price": 10.99, "description": "Classic tomato & mozzarella"},
            {"item_id": "pc2", "name": "Pepperoni Feast", "price": 12.99, "description": "Double spicy pepperoni"},
            {"item_id": "pc3", "name": "Garlic Breadsticks", "price": 4.99, "description": "Buttery garlic sticks"},
            {"item_id": "pc4", "name": "Veggie Supreme", "price": 11.49, "description": "Mixed peppers and onions"},
        ],
        "offers": [{"offer_id": "of2", "title": "BOGO Offer", "description": "Buy 1 Get 1 free on medium pizzas", "discount_percent": 50, "active": True}], 
        "is_open": True,
    },
    {
        "stall_id": "merch-2", "stadium_id": "Chepauk", "name": "Matchday Merchandise", "category": "merchandise",
        "zone_id": "A4", "location_hint": "East Gate Plaza",
        "menu": [
            {"item_id": "m2", "name": "Team Jersey", "price": 59.99, "description": "Official replica jersey"},
            {"item_id": "m2-2", "name": "Team Scarf", "price": 15.99, "description": "Woven team colors scarf"},
            {"item_id": "m2-3", "name": "Player Poster", "price": 9.99, "description": "A2 high-gloss poster"},
            {"item_id": "m2-4", "name": "Team Flag", "price": 12.49, "description": "Large stadium flag"},
        ],
        "offers": [{"offer_id": "of3", "title": "Fan Pack", "description": "Jersey + Cap + Scarf for $79.99", "combo_price": 79.99, "active": True}],
        "is_open": True,
    },
    {
        "stall_id": "ent-2", "stadium_id": "Chepauk", "name": "Photo & Fun Booth", "category": "entertainment",
        "zone_id": "C3", "location_hint": "Beside South Gate Gate",
        "menu": [
            {"item_id": "e2", "name": "Photo Booth", "price": 5.00, "description": "Green screen team photo"},
            {"item_id": "e2-2", "name": "Face Painting", "price": 3.00, "description": "Team colors face paint"},
            {"item_id": "e2-3", "name": "Claw Machine", "price": 2.00, "description": "Win team plush toys"},
            {"item_id": "e2-4", "name": "Jersey Engraving", "price": 10.00, "description": "Custom name on jersey"},
        ],
        "offers": [{"offer_id": "of4", "title": "Fun Choice", "description": "Photo + Painting for $7.00", "combo_price": 7.00, "active": True}],
        "is_open": True,
    },
    {
        "stall_id": "food-3", "stadium_id": "Wankhede", "name": "Noodle House", "category": "food",
        "zone_id": "C3", "location_hint": "Near Gate South",
        "menu": [
            {"item_id": "nb1", "name": "Ramen Bowl", "price": 11.99, "description": "Rich tonkotsu ramen"},
            {"item_id": "nb2", "name": "Spring Rolls", "price": 4.49, "description": "Vegetable spring rolls (4pcs)"},
            {"item_id": "nb3", "name": "Chicken Gyoza", "price": 6.99, "description": "Steamed chicken dumplings"},
            {"item_id": "nb4", "name": "Yakisoba Noodles", "price": 9.49, "description": "Stir-fried wheat noodles"},
        ],
        "offers": [{"offer_id": "of5", "title": "Zen Deal", "description": "Ramen + Rolls + Tea for $15.99", "combo_price": 15.99, "active": True}],
        "is_open": True,
    },
    {
        "stall_id": "food-5", "stadium_id": "Wankhede", "name": "Taco Town", "category": "food",
        "zone_id": "B1", "location_hint": "West Corridor",
        "menu": [
            {"item_id": "tt1", "name": "Veggie Wrap", "price": 7.99, "description": "Grilled veggie tortilla wrap"},
            {"item_id": "tt2", "name": "Beef Tacos", "price": 9.49, "description": "Three spicy beef tacos"},
            {"item_id": "tt3", "name": "Nachos Grande", "price": 6.99, "description": "Large portion of cheesy nachos"},
            {"item_id": "tt4", "name": "Churros", "price": 4.99, "description": "Cinnamon sugar dough sticks"},
        ],
        "offers": [{"offer_id": "of6", "title": "Fiesta Box", "description": "3 Tacos + Nachos for $14.49", "combo_price": 14.49, "active": True}],
        "is_open": True,
    },
    {
        "stall_id": "merch-1", "stadium_id": "Wankhede", "name": "Fan Zone Store", "category": "merchandise",
        "zone_id": "C2", "location_hint": "Beside Merchandise Plaza",
        "menu": [
            {"item_id": "mz1", "name": "Team Jersey", "price": 79.99, "description": "Official replica jersey"},
            {"item_id": "mz2", "name": "Team Hoodie", "price": 45.49, "description": "Warm team-branded hoodie"},
            {"item_id": "mz3", "name": "Lanyard", "price": 6.99, "description": "Team colors lanyard"},
            {"item_id": "mz4", "name": "Keyring", "price": 4.49, "description": "Stainless steel logo keyring"},
        ],
        "offers": [{"offer_id": "of7", "title": "Merch Bundle", "description": "Jersey + Hoodie + Lanyard for $120.00", "combo_price": 120.0, "active": True}],
        "is_open": True,
    },
    {
        "stall_id": "ent-3", "stadium_id": "Wankhede", "name": "VR Experience", "category": "entertainment",
        "zone_id": "A3", "location_hint": "North Arcade",
        "menu": [
            {"item_id": "vr1", "name": "VR Match Simulation", "price": 15.00, "description": "Virtual penalty shootout"},
            {"item_id": "vr2", "name": "AR Player Meet", "price": 8.00, "description": "Virtual photo with top players"},
            {"item_id": "vr3", "name": "3D Stadium Tour", "price": 5.00, "description": "Immersive historical tour"},
            {"item_id": "vr4", "name": "Retro Gaming", "price": 2.00, "description": "Classic arcade booth session"},
        ],
        "offers": [{"offer_id": "of8", "title": "Tech Pass", "description": "All 4 experiences for $25.00", "combo_price": 25.0, "active": True}],
        "is_open": True,
    },
    {
        "stall_id": "ent-1", "stadium_id": "NarendraModi", "name": "AR Experience Zone", "category": "entertainment",
        "zone_id": "B3", "location_hint": "Central Arena – East Wing",
        "menu": [
            {"item_id": "ar1", "name": "AR Stadium Tour", "price": 12.99, "description": "15-min augmented reality tour"},
            {"item_id": "ar2", "name": "Hologram Selfie", "price": 6.99, "description": "Snap with 3D player holograms"},
            {"item_id": "ar3", "name": "Trivia Challenge", "price": 3.00, "description": "Win prizes in sports quiz"},
            {"item_id": "ar4", "name": "Mini-Pitch Arena", "price": 5.00, "description": "5-minute physical shootout"},
        ],
        "offers": [{"offer_id": "of9", "title": "Tour Deal", "description": "Tour + Selfie for $17.99", "combo_price": 17.99, "active": True}],
        "is_open": True,
    },
    {
        "stall_id": "food-4", "stadium_id": "NarendraModi", "name": "Juice Bar", "category": "food",
        "zone_id": "B1", "location_hint": "Near Gate West",
        "menu": [
            {"item_id": "js1", "name": "Mango Smoothie", "price": 5.99, "description": "Fresh mango blend"},
            {"item_id": "js2", "name": "Citrus Spritz", "price": 4.49, "description": "Zesty orange & lime"},
            {"item_id": "js3", "name": "Detox Juice", "price": 6.49, "description": "Green apple and cucumber"},
            {"item_id": "js4", "name": "Fruit Bowl", "price": 4.99, "description": "Seasonal cut fruit medley"},
        ],
        "offers": [{"offer_id": "of10", "title": "Hydration Pack", "description": "2 Smoothies for $10.00", "combo_price": 10.0, "active": True}],
        "is_open": True,
    },
    {
        "stall_id": "food-6", "stadium_id": "NarendraModi", "name": "Stadium Grill", "category": "food",
        "zone_id": "C2", "location_hint": "South Plaza",
        "menu": [
            {"item_id": "g2", "name": "BBQ Wings", "price": 9.99, "description": "Smoky BBQ chicken wings (8pcs)"},
            {"item_id": "g3", "name": "Hot Dog", "price": 6.49, "description": "Classic stadium frankfurter"},
            {"item_id": "g4", "name": "Steak Sandwich", "price": 12.99, "description": "Ribeye strips with peppers"},
            {"item_id": "g5", "name": "Cole Slaw", "price": 2.49, "description": "Creamy house-made slaw side"},
        ],
        "offers": [{"offer_id": "of11", "title": "Grill Feast", "description": "Wings + Hot Dog for $15.00", "combo_price": 15.0, "active": True}],
        "is_open": True,
    },
    {
        "stall_id": "merch-3", "stadium_id": "NarendraModi", "name": "Fan Zone Store", "category": "merchandise",
        "zone_id": "A2", "location_hint": "North Concourse",
        "menu": [
            {"item_id": "m3", "name": "Cap", "price": 19.99, "description": "Official team cap"},
            {"item_id": "m3-2", "name": "Wristband", "price": 3.99, "description": "Silicon team colors band"},
            {"item_id": "m3-3", "name": "Mug", "price": 12.49, "description": "Ceramic team logo mug"},
            {"item_id": "m3-4", "name": "Backpack", "price": 35.99, "description": "Branded matchday rucksack"},
        ],
        "offers": [{"offer_id": "of12", "title": "Fan Kit", "description": "Cap + Mug + Wristband for $30.00", "combo_price": 30.0, "active": True}],
        "is_open": True,
    },
]

# ── Help / Emergency Locations ──────────────────────────────────────
HELP_LOCATIONS = [
    {
        "location_id": "med-1", "stadium_id": "Chepauk", "name": "Medical Room Alpha", "type": "medical",
        "zone_id": "A1", "description": "Primary medical room near Gate North.",
        "phone": "+1-555-0101",
    },
    {
        "location_id": "info-1", "stadium_id": "Chepauk", "name": "Info Desk – North", "type": "info_desk",
        "zone_id": "GATE_N", "description": "Main information desk at North Gate.",
        "phone": "+1-555-0110",
    },
    {
        "location_id": "med-2", "stadium_id": "Wankhede", "name": "Medical Room Beta", "type": "medical",
        "zone_id": "C4", "description": "South-side medical station near Gate South.",
        "phone": "+1-555-0102",
    },
    {
        "location_id": "info-2", "stadium_id": "Wankhede", "name": "Info Desk – South", "type": "info_desk",
        "zone_id": "GATE_S", "description": "Information desk at South Gate.",
        "phone": "+1-555-0120",
    },
    {
        "location_id": "first-aid-1", "stadium_id": "NarendraModi", "name": "First Aid Point – Central", "type": "first_aid",
        "zone_id": "B2", "description": "Quick first-aid station in the Central Arena.",
        "phone": "+1-555-0103",
    },
    {
        "location_id": "info-3", "stadium_id": "NarendraModi", "name": "Info Desk – East", "type": "info_desk",
        "zone_id": "GATE_E", "description": "Information desk at East Gate entrance.",
        "phone": "+1-555-0130",
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
