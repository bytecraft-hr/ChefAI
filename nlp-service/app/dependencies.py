import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Generator
from fastapi import Depends

from app.core.config import settings
from app.core.nlp_manager import NLPManager

def get_db_connection() -> Generator[psycopg2.extensions.connection, None, None]:
    conn = psycopg2.connect(settings.DATABASE_URL, cursor_factory=RealDictCursor)
    try:
        yield conn
    finally:
        conn.close()

def get_nlp_manager(
    db_conn = Depends(get_db_connection),
):
    # lazy‐initialize spaCy, SBERT, RAG
    NLPManager.init(db_conn)
    return NLPManager
