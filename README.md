# 🏟️ CrowdSense AI – Smart Stadium Management System

> AI-powered system that improves the physical event experience at large-scale sporting venues through predictive crowd routing, virtual queues, and intelligent assistance.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (SPA)                           │
│  HTML/CSS/JS • Heatmap • Chat UI • Responsive • i18n       │
├─────────────────────────────────────────────────────────────┤
│                    FastAPI Backend                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │  Crowd   │ │ Routing  │ │  Queue   │ │  Decision    │  │
│  │ Service  │ │ Service  │ │ Service  │ │  Engine      │  │
│  │(NumPy LR)│ │(Dijkstra)│ │(Virtual) │ │(Aggregator)  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │Assistant │ │  Cache   │ │ Sanitize │ │    Logger    │  │
│  │(NLP/Rule)│ │ (TTL)    │ │ (Input)  │ │ (Structured) │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
├─────────────────────────────────────────────────────────────┤
│              Mock Firestore (Dict-based)                    │
│          Swappable with Google Cloud Firestore              │
└─────────────────────────────────────────────────────────────┘
```

## ✨ Features

### Core Intelligence
- **Predictive Crowd Routing** – NumPy linear regression predicts density; Dijkstra finds optimal paths with hybrid weights (0.6×current + 0.4×predicted)
- **Decision Engine** – Combines crowd + routing + queue data for smart recommendations
- **Smart Queue System** – Virtual tokens, wait-time prediction, online ordering
- **AI Assistant** – Rule-based NLP with intent detection, context-aware responses

### User Experience
- **Live Heatmap** – Canvas-based real-time crowd density visualization
- **Dark/Light Mode** – Theme toggle with CSS variables
- **Multi-Language** – English, Spanish, Hindi, French (JSON-based, no reload)
- **Help & Emergency** – Click-to-call, medical rooms, first aid, info desks
- **Stalls Directory** – Food, merchandise, entertainment with menus & offers
- **Smart Navigation** – Route to any zone, find best exit, navigate to stalls

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- pip

### Setup & Run

```bash
# 1. Install dependencies
cd backend
pip install -r requirements.txt

# 2. Start the server
cd ..
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload

# 3. Open browser
# http://localhost:8000
```

### Run Tests

```bash
cd backend
python -m pytest tests/ -v
```

## 📡 API Documentation

### Crowd
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/crowd/snapshot` | All zones density (current + predicted) |
| GET | `/api/v1/crowd/zone/{zone_id}` | Single zone density |

### Routing
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/routing/find` | Find optimal route between zones |
| GET | `/api/v1/routing/exit/{zone}` | Find best exit from a zone |

### Queue & Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/queue/all` | All stall queue info |
| POST | `/api/v1/queue/order` | Place an order |
| GET | `/api/v1/queue/order/{id}` | Get order status |
| PATCH | `/api/v1/queue/order/{id}/status` | Update order status |
| POST | `/api/v1/queue/stall/{id}/toggle` | Pause/resume orders |

### Decision Engine
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/decision/recommend` | Get smart recommendations |

### AI Assistant
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/assistant/chat` | Chat with AI assistant |

### Stalls & Help
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/stalls` | List all stalls (filter: ?category=) |
| GET | `/api/v1/help` | List help locations |
| GET | `/api/v1/zones` | List all zones with positions |

## 🐳 Docker Deployment

```bash
# Build
docker build -t crowdsense-ai .

# Run
docker run -p 8000:8000 crowdsense-ai
```

### Google Cloud Run

```bash
# Build & push
gcloud builds submit --tag gcr.io/PROJECT_ID/crowdsense-ai

# Deploy
gcloud run deploy crowdsense-ai \
  --image gcr.io/PROJECT_ID/crowdsense-ai \
  --platform managed \
  --allow-unauthenticated \
  --port 8000
```

## 📁 Project Structure

```
CrowdSense AI/
├── backend/
│   ├── app/
│   │   ├── data/           # Seed data & zone graph
│   │   ├── models/         # Pydantic schemas
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Business logic
│   │   │   ├── crowd_service.py      # Density simulation + prediction
│   │   │   ├── routing_service.py    # Dijkstra pathfinding
│   │   │   ├── queue_service.py      # Virtual queue & orders
│   │   │   ├── decision_engine.py    # Smart recommendations
│   │   │   └── assistant_service.py  # AI chatbot
│   │   ├── utils/          # Cache, logger, sanitization
│   │   └── main.py         # FastAPI app entry
│   ├── tests/              # pytest test suite
│   └── requirements.txt
├── frontend/
│   ├── index.html          # Single-page app
│   ├── styles.css          # Design system (dark/light)
│   ├── app.js              # Frontend logic
│   └── translations.json   # i18n (en, es, hi, fr)
├── Dockerfile
└── README.md
```

## 🔒 Security

- Rate limiting (120 req/min) via SlowAPI
- Input sanitization on all user inputs
- CORS restricted to localhost
- Pydantic schema validation on all endpoints

## ⚡ Performance

- TTL-based caching (15s default) avoids redundant computation
- Optimized prediction calls with history buffer
- Lightweight NumPy-only ML (no heavy dependencies)

## 📄 License

MIT License
