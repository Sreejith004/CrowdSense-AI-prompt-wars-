"""CrowdSense AI – FastAPI Application Entry Point."""
from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.data.seed import seed_database
from app.routes import assistant, auth, crowd, decision, facilities, queue, routing, stalls
from app.utils.logger import get_logger

log = get_logger("main")

# Rate limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown events."""
    log.info("CrowdSense AI starting up...")
    seed_database()
    log.info("Database seeded successfully")
    yield
    log.info("CrowdSense AI shutting down.")


app = FastAPI(
    title="CrowdSense AI",
    description="AI-Powered Smart Stadium Management System",
    version="1.0.0",
    lifespan=lifespan,
)

# ── Middleware ────────────────────────────────────────────────────────
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(status_code=429, content={"error": "Rate limit exceeded. Try again later."})


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(crowd.router)
app.include_router(facilities.router)
app.include_router(routing.router)
app.include_router(queue.router)
app.include_router(decision.router)
app.include_router(assistant.router)
app.include_router(stalls.router)

# ── Static files (frontend) ──────────────────────────────────────────
# Calculate path relative to this file: backend/app/main.py -> ../../frontend
base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
frontend_dir = os.path.join(base_dir, "frontend")

if os.path.isdir(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
else:
    # Fallback to CWD just in case
    frontend_dir = os.path.join(os.getcwd(), "frontend")
    if os.path.isdir(frontend_dir):
        app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")


@app.get("/api/health")
async def health():
    return {"status": "healthy", "service": "CrowdSense AI", "version": "1.0.0"}