import datetime
import os
import logging
from fastapi import FastAPI
from firebase_admin import credentials, firestore, initialize_app
from contextlib import asynccontextmanager
from ..core.config import settings

logger = logging.getLogger("uvicorn.error")
_db = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _db
    cred_path = settings.FIREBASE_CREDENTIALS_PATH
    if cred_path and os.path.isfile(cred_path):
        try:
            cred = credentials.Certificate(cred_path)
            initialize_app(cred)
            _db = firestore.client()
            logger.info("✅ Firebase initialized")
        except Exception as e:
            logger.error(f"Firebase init failed: {e}")
    else:
        logger.warning("🔒 Firebase disabled (no credentials)")
    yield
    logger.info("🔒 Backend shutdown")

class FirebaseClient:
    def __init__(self):
        global _db
        self._db = _db

    async def save_chat_history(self, user_id: int, session_id: str, query: str, response: str) -> bool:
        if not self._db:
            return False
        try:
            ref = self._db.collection("chats").document(session_id)
            ref.set({
                "user_id": user_id,
                "timestamp": firestore.SERVER_TIMESTAMP,
                "messages": firestore.ArrayUnion([{
                    "query": query,
                    "response": response,
                    "timestamp": datetime.datetime.utcnow().isoformat(),
                }]),
            }, merge=True)
            return True
        except Exception as e:
            logger.error(f"Firebase save error: {e}")
            return False

    async def get_messages(self, session_id: str) -> list:
        if not self._db:
            return []
        try:
            doc = self._db.collection("chats").document(session_id).get()
            if doc.exists:
                return doc.to_dict().get("messages", [])
        except Exception as e:
            logger.error(f"Firebase get error: {e}")
        return []

def get_firebase_client() -> FirebaseClient:
    return FirebaseClient()
