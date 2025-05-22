import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import process, health

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("chef_ai-nlp-service")

app = FastAPI(title="Cookbook NLP Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or tighten to your backend URL
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(process.router, prefix="/process")
app.include_router(health.router)

@app.on_event("startup")
def on_startup():
    logger.info("✅ NLP service is up")
