# backend/app/routers/chat/rag.py
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ...schemas.chat import ChatRequest, ChatResponse
from ...dependencies import get_db, get_nlp_manager
from ...services.auth import get_current_active_user
from ...services.firebase import get_firebase_client

logger = logging.getLogger("chef_ai.chat_rag")

router = APIRouter(tags=["Chat-RAG"])

@router.post("", response_model=ChatResponse)
async def chat_rag(
    req: ChatRequest,
    nlp_mgr=Depends(get_nlp_manager),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    if req.mode != "rag":
        logger.error("Invalid mode %r on /chat/rag", req.mode)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid mode; must be 'rag'",
        )

    chain = nlp_mgr.get_rag_chain()
    if chain is None:
        logger.error("RAG chain is not available (get_rag_chain returned None)")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="RAG service unavailable",
        )

    session_id = req.session_id or str(uuid.uuid4())
    firebase = get_firebase_client()

    # 🧠 Try loading chat history from Firestore
    chat_history = []
    try:
        messages = await firebase.get_messages(session_id)
        for m in messages[-10:]:  # limit to last 10 turns
            chat_history.append({"role": "user", "content": m["query"]})
            chat_history.append({"role": "bot", "content": m["response"]})
    except Exception as e:
        logger.warning(f"Failed to load chat history for session {session_id}: {e}")

    # 🧠 Run the RAG chain
    try:
        out = await chain.ainvoke({
            "input": req.query,
            "chat_history": chat_history,
        })
    except Exception:
        logger.exception("Error running RAG chain")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="RAG processing failed; check server logs",
        )

    # ✅ Save interaction
    await firebase.save_chat_history(
        user_id=current_user.id,
        session_id=session_id,
        query=req.query,
        response=out.get("answer", "")
    )

    return ChatResponse(
        message=out.get("answer", ""),
        recommendations=out.get("recommendations", []),
        session_id=session_id,
        timestamp=datetime.now(timezone.utc).isoformat(),
        history=chat_history
    )
