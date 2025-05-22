from datetime import datetime, timezone
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ...schemas.chat import ChatRequest, ChatResponse
from ...dependencies import get_db
from ...services.auth import get_current_active_user
from ...services.spoonacular import fetch_recipes_online

router = APIRouter(tags=["Chat-Online"])


@router.post("", response_model=ChatResponse)
async def chat_online(
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user),
):
    if req.mode != "online":
        raise HTTPException(status_code=400, detail="Invalid mode")

    pantry = [i.name for i in current_user.pantry_items]
    if not pantry:
        return ChatResponse(
            message="Your pantry is empty. Add ingredients first.",
            recommendations=[],
            session_id=req.session_id or str(uuid.uuid4()),
            timestamp=datetime.now(timezone.utc).isoformat()
        )

    try:
        recs = await fetch_recipes_online(pantry, number=5)
    except Exception:
        raise HTTPException(status_code=502, detail="Couldn't fetch recipes right now.")

    msg = f"I found {len(recs)} recipes online!" if recs else "No recipes found."
    return ChatResponse(
        message=msg,
        recommendations=recs,
        session_id=req.session_id or str(uuid.uuid4()),
        timestamp=datetime.now(timezone.utc).isoformat()
    )
