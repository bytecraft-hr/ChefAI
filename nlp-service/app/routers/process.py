import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from psycopg2.extensions import connection

from app.schemas.process import ProcessRequest, ProcessResponse
from app.dependencies import get_db_connection, get_nlp_manager
from app.services.db import get_recipes, get_user_profile
from app.services.nlp import (
    extract_intent_and_entities,
    filter_recipes,
    rank_recipes,
    personalize_response,
)

router = APIRouter(prefix="/process", tags=["Process"])

@router.post("/", response_model=ProcessResponse)
async def process_query(
    req: ProcessRequest,
    db_conn: connection = Depends(get_db_connection),
    nlp_mgr=Depends(get_nlp_manager),
):
    session_id = req.session_id or str(uuid.uuid4())
    ts = datetime.utcnow().isoformat()

    recipes = get_recipes(db_conn)
    profile = get_user_profile(db_conn, req.user_id)

    # RAG
    if req.mode == "rag":
        chain = nlp_mgr.get_rag_chain()
        if not chain:
            raise HTTPException(503, "RAG unavailable")
        try:
            out = await chain.ainvoke({"input": req.query, "chat_history": []})
            return ProcessResponse(message=out.get("answer",""), session_id=session_id, timestamp=ts)
        except Exception:
            raise HTTPException(500, "RAG processing failed")

    # Rule
    intent, _ = extract_intent_and_entities(req.query)
    if intent != "suggest_dish":
        raise HTTPException(400, "Could not handle request")
    filtered = filter_recipes(recipes, profile["pantry"], profile["preferences"])
    ranked = rank_recipes(req.query, filtered)
    msg = personalize_response(req.query, ranked)
    recs = ranked[:3]
    return ProcessResponse(
        message=msg, recommendations=recs, session_id=session_id, timestamp=ts
    )
