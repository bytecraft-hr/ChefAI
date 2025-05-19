# backend/app/dependencies.py

from typing import Generator

from fastapi import Depends
from sqlalchemy.orm import Session

from .core.nlp_manager import NLPManager
from .db.session import SessionLocal

def get_db() -> Generator[Session, None, None]:
    """
    Yields a SQLAlchemy Session, closing it when done.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_nlp_manager(db: Session = Depends(get_db)) -> NLPManager:
    """
    Thread-safe one-time initialization of RAG chain + vector store.
    Returns the NLPManager class (with .get_rag_chain() etc.).
    """
    NLPManager.init(db)
    return NLPManager
