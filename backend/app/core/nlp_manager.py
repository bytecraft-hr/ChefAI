import threading
from typing import Optional
import spacy
from sentence_transformers import SentenceTransformer
from langchain_mistralai import ChatMistralAI
from ..services.nlp_service import build_vector_store, create_rag_chain, get_recipes_from_db
from sqlalchemy.orm import Session
import logging
from ..core import VectorStoreInitializationError

logger = logging.getLogger("chef_ai.nlp_manager")

class VectorStoreInitializationError(Exception):
    """Custom exception for vector store initialization failures."""
    pass

class NLPManager:
    _lock = threading.Lock()
    _nlp: Optional[spacy.Language] = None
    _sbert: Optional[SentenceTransformer] = None
    _vector_store = None
    _rag_chain = None

    @classmethod
    def init(cls, db: Session):
        with cls._lock:
            if cls._nlp is None:
                cls._nlp = spacy.load("en_core_web_sm")
                cls._sbert = SentenceTransformer("all-MiniLM-L6-v2")
                try:
                    recipes = get_recipes_from_db(db)
                    cls._vector_store = build_vector_store(recipes)
                    if cls._vector_store:
                        cls._rag_chain = create_rag_chain(ChatMistralAI(), cls._vector_store)
                    else:
                        logger.error("Failed to initialize vector store.")
                        raise VectorStoreInitializationError("Failed to initialize vector store.")
                except Exception as e:
                    logger.error(f"Error during NLPManager initialization: {e}", exc_info=True)
                    raise  # Re-raise the exception to prevent silent failure

    @classmethod
    def get_spacy(cls):
        return cls._nlp

    @classmethod
    def get_sbert(cls):
        return cls._sbert

    @classmethod
    def get_rag_chain(cls):
        return cls._rag_chain