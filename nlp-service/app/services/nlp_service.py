import os
import uuid
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional
import logging

import spacy
from sentence_transformers import SentenceTransformer, util
from sqlalchemy.orm import Session, joinedload

from ..db.models import Recipe, RecipeIngredient, Ingredient, User
from ..core import VectorStoreInitializationError  # Import from __init__.py

# Optional RAG deps
try:
    from langchain_mistralai import ChatMistralAI
    from langchain_core.documents import Document
    from langchain.chains import create_history_aware_retriever, create_retrieval_chain
    from langchain.chains.combine_documents import create_stuff_documents_chain
    from langchain.prompts import ChatPromptTemplate
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    from langchain_chroma import Chroma
    from langchain_mistralai import MistralAIEmbeddings
    HAS_RAG_DEPS = True
except ImportError:
    HAS_RAG_DEPS = False

logger = logging.getLogger("chef_ai.nlp_service")
print("HAS_RAG_DEPS =", HAS_RAG_DEPS)

# — DB helpers —

def get_recipes_from_db(db: Session) -> List[Dict[str, Any]]:
    logger.info("get_recipes_from_db called")
    recipes = (
        db.query(Recipe)
        .options(joinedload(Recipe.recipe_ingredients)
                 .joinedload(RecipeIngredient.ingredient))
        .all()
    )
    logger.info(f"get_recipes_from_db returned {len(recipes)} recipes")
    print("Recipes from DB:", recipes)

    out: List[Dict[str, Any]] = []
    for r in recipes:
        ingredients = [ri.ingredient.name for ri in r.recipe_ingredients]
        out.append({
            "id": r.id,
            "title": r.title,
            "prep_time": r.prep_time,
            "servings": r.servings,
            "cooking_method": r.cooking_method,
            "instructions": r.instructions,
            "diet": r.diet,
            "ingredients": ingredients,
        })
    return out

def get_user_profile_from_db(db: Session, user_id: int) -> Dict[str, Any]:
    user = db.get(User, user_id)
    if not user:
        return {"preferences": {}, "pantry": []}

    prefs_raw = user.settings.preferences if user.settings else {}
    prefs = prefs_raw if isinstance(prefs_raw, dict) else {}

    pantry = [item.name for item in user.pantry_items]
    return {"preferences": prefs, "pantry": pantry}

# — Rule-based NLP —

def extract_intent_and_entities(query: str) -> Tuple[str, Dict[str, List[str]]]:
    intent = "unknown"
    entities: List[str] = []
    keywords: List[str] = []
    doc = spacy.blank("en")(query.lower()) if not spacy else spacy.load("en_core_web_sm")(query.lower())
    lemmas = {tok.lemma_ for tok in doc}
    if lemmas & {"cook", "make", "prepare", "recipe"}:
        intent = "suggest_dish"
    entities = [e.text for e in doc.ents]
    keywords = [tok.text for tok in doc if tok.pos_ in {"NOUN", "ADJ"}]
    return intent, {"entities": entities, "keywords": keywords}

def filter_recipes(
    recipes: List[Dict[str, Any]],
    pantry: List[str],
    prefs: Dict[str, Any]
) -> List[Dict[str, Any]]:
    out = []
    threshold = prefs.get("match_threshold", 0.5)
    for r in recipes:
        ingr = set(r["ingredients"])
        if len(ingr & set(pantry)) / max(len(ingr), 1) < threshold:
            continue
        dp = prefs.get("dietary_preference", "any")
        if dp != "any" and r.get("diet") != dp:
            continue
        if r.get("prep_time", 0) > prefs.get("max_prep_time", 60):
            continue
        if r.get("servings", 0) < prefs.get("min_servings", 1):
            continue
        cm = prefs.get("cooking_method", "any")
        if cm != "any" and r.get("cooking_method") != cm:
            continue
        out.append(r)
    return out

def rank_recipes(query: str, recipes: List[Dict[str, Any]], model=None) -> List[Dict[str, Any]]:
    if not model or not recipes:
        return recipes
    qemb = model.encode(query, convert_to_tensor=True)
    scored = []
    for r in recipes:
        text = f"{r['title']}. {r['instructions']}"
        remb = model.encode(text, convert_to_tensor=True)
        score = util.cos_sim(qemb, remb).item()
        scored.append((score, r))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [r for _, r in scored]

def personalize_response(query: str, recipes: List[Dict[str, Any]]) -> str:
    if not recipes:
        return "I couldn't find any recipes matching your criteria."
    if len(recipes) == 1:
        return f"I found the perfect recipe for you: {recipes[0]['title']}!"
    return f"I found {len(recipes)} recipes. Top recommendation is {recipes[0]['title']}!"

# — RAG helpers —

def build_vector_store(recipes: List[Dict[str, Any]]):
    if not HAS_RAG_DEPS:
        logger.warning("RAG dependencies are not met, cannot build vector store.")
        return None
    path = "./chroma_db"
    try:
        logger.info(f"Attempting to build or load Chroma vector store from: {path}")
        if os.path.exists(path):
            logger.info("Chroma directory exists, attempting to load.")
            store = Chroma(persist_directory=path, embedding_function=MistralAIEmbeddings(model="mistral-embed"))
            logger.info("Chroma vector store loaded successfully.")
            return store
        else:
            logger.info("Chroma directory does not exist, creating a new one.")
            logger.info(f"Number of recipes fetched from DB: {len(recipes)}")
            print("Recipes received by build_vector_store:", recipes)

            docs = [
                Document(
                    page_content=f"{r['title']}. {r['instructions']}",
                    metadata={"id": r['id'], "diet": r.get('diet', 'any')}
                )
                for r in recipes
            ]

            logger.info(f"Number of LangChain documents created: {len(docs)}")
            print("LangChain Documents:", docs)
            splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=0)
            chunks = splitter.split_documents(docs)
            logger.info(f"Number of document chunks created: {len(chunks)}")
            embeddings = MistralAIEmbeddings(model="mistral-embed")
            logger.info("MistralAIEmbeddings initialized.")
            if not chunks:
                logger.warning("No document chunks to process. Vector store will be empty.")
            store = Chroma.from_documents(chunks, embeddings, persist_directory=path)
            logger.info("Chroma vector store created and persisted successfully.")
            return store
    except Exception as e:
        logger.error(f"Error during Chroma vector store operation: {e}", exc_info=True)
        raise VectorStoreInitializationError(f"Failed to initialize Chroma vector store: {e}")

def create_rag_chain(llm, store, k: int = 4):
    if not HAS_RAG_DEPS or not llm or not store:
        logger.warning("Cannot create RAG chain. RAG dependencies not met or LLM/store is None.")
        return None
    retr = store.as_retriever(search_type="similarity", search_kwargs={"k": k})
    ctx_prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a meal recommendation assistant. Reformulate the user's query."),
        ("human", "{input}")
    ])
    har = create_history_aware_retriever(llm, retr, ctx_prompt)
    qa_prompt = ChatPromptTemplate.from_messages([
        ("system", "Based on context below, suggest recipes:\n{context}"),
        ("human", "{input}")
    ])
    stuff = create_stuff_documents_chain(llm, qa_prompt)
    return create_retrieval_chain(har, stuff)
