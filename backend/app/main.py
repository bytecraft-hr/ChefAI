import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import AsyncExitStack, asynccontextmanager
from .services.firebase import lifespan as firebase_lifespan

from .core.config import settings
from .routers import users, pantry, settings as settings_router, chat
from .routers import favorites
from app.routers import cook

from fastapi.staticfiles import StaticFiles
import os

# ─────────── Logging setup ───────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("chef_ai-backend")

# ─────────── Normalize origins ───────────
# Pydantic’s AnyHttpUrl may add a trailing slash; strip it so
# it exactly matches the browser’s Origin header.
normalized_origins = [str(url).rstrip("/") for url in settings.ALLOWED_ORIGINS]

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with AsyncExitStack() as stack:
        await stack.enter_async_context(firebase_lifespan(app))

        # Logging startup
        logger.info("→ raw ALLOWED_ORIGINS from settings: %s", settings.ALLOWED_ORIGINS)
        logger.info("→ normalized ALLOWED_ORIGINS for CORS: %s", normalized_origins)
        logger.info("✅ Service started")

        yield

        logger.info("🛑 Service stopped")


# ─────────── Create FastAPI app ───────────
app = FastAPI(
    title="Chef-AI Backend",
    version="1.1.0",
    lifespan=lifespan,
)

# ─────────── CORS middleware ───────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=normalized_origins,  # must be List[str] of exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────── Include routers ───────────
app.include_router(users.router)
app.include_router(pantry.router)
app.include_router(settings_router.router)
app.include_router(chat.router)
app.include_router(favorites.router) 
app.include_router(cook.router)

# Ensure the folder exists
os.makedirs("static/images", exist_ok=True)

# Mount static route
app.mount("/static", StaticFiles(directory="static"), name="static")

# ─────────── Health check ───────────
@app.get("/ping", tags=["Health"])
async def ping():
    return {"status": "healthy"}