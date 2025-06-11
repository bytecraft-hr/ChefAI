import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import AsyncExitStack, asynccontextmanager
<<<<<<< HEAD
from .services.firebase import lifespan as firebase_lifespan

from .core.config import settings
from .routers import users, pantry, settings as settings_router, chat
from .routers import favorites
from app.routers import cook

from fastapi.staticfiles import StaticFiles
import os
=======

from .services.firebase import lifespan as firebase_lifespan
from .core.config import settings
from .routers import users, pantry, settings as settings_router, chat, favorites
>>>>>>> ca23dc08af9d27adb02a102d31479653c8b874fa

# ─────────── Logging setup ───────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("chef_ai-backend")

# ─────────── Normalize origins ───────────
<<<<<<< HEAD
# Pydantic’s AnyHttpUrl may add a trailing slash; strip it so
# it exactly matches the browser’s Origin header.
normalized_origins = [str(url).rstrip("/") for url in settings.ALLOWED_ORIGINS]

=======
normalized_origins = [str(url).rstrip("/") for url in settings.ALLOWED_ORIGINS]

# ─────────── Lifespan context manager ───────────
>>>>>>> ca23dc08af9d27adb02a102d31479653c8b874fa
@asynccontextmanager
async def lifespan(app: FastAPI):
    async with AsyncExitStack() as stack:
        await stack.enter_async_context(firebase_lifespan(app))

<<<<<<< HEAD
        # Logging startup
=======
        # Logging
>>>>>>> ca23dc08af9d27adb02a102d31479653c8b874fa
        logger.info("→ raw ALLOWED_ORIGINS from settings: %s", settings.ALLOWED_ORIGINS)
        logger.info("→ normalized ALLOWED_ORIGINS for CORS: %s", normalized_origins)
        logger.info("✅ Service started")

        yield

        logger.info("🛑 Service stopped")

<<<<<<< HEAD

=======
>>>>>>> ca23dc08af9d27adb02a102d31479653c8b874fa
# ─────────── Create FastAPI app ───────────
app = FastAPI(
    title="Chef-AI Backend",
    version="1.1.0",
    lifespan=lifespan,
)

# ─────────── CORS middleware ───────────
app.add_middleware(
    CORSMiddleware,
<<<<<<< HEAD
    allow_origins=normalized_origins,  # must be List[str] of exact origins
=======
    allow_origins=["http://localhost:3000"],
>>>>>>> ca23dc08af9d27adb02a102d31479653c8b874fa
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────── Include routers ───────────
app.include_router(users.router)
app.include_router(pantry.router)
app.include_router(settings_router.router)
app.include_router(chat.router)
<<<<<<< HEAD
app.include_router(favorites.router) 
app.include_router(cook.router)

# Ensure the folder exists
os.makedirs("static/images", exist_ok=True)

# Mount static route
app.mount("/static", StaticFiles(directory="static"), name="static")
=======
app.include_router(favorites.router)
>>>>>>> ca23dc08af9d27adb02a102d31479653c8b874fa

# ─────────── Health check ───────────
@app.get("/ping", tags=["Health"])
async def ping():
<<<<<<< HEAD
    return {"status": "healthy"}
=======
    return {"status": "healthy"}

>>>>>>> ca23dc08af9d27adb02a102d31479653c8b874fa
