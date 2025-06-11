# backend/app/routers/rule.py

from datetime import datetime, timezone
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ...schemas.chat import ChatRequest, ChatResponse, RecipeDetail
from ...dependencies import get_db, get_nlp_manager
from ...services.auth import get_current_active_user
from ...services.nlp_service import (
    get_recipes_from_db,
    get_user_profile_from_db,
    extract_intent_and_entities,
    filter_recipes,
    rank_recipes,
    personalize_response,
)

router = APIRouter(tags=["Chat-Rule"])

@router.post("", response_model=ChatResponse)
async def chat_rule(
    req: ChatRequest,
    nlp_mgr = Depends(get_nlp_manager),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user),
):
    if req.mode != "rule":
        raise HTTPException(status_code=400, detail="Invalid mode")

    recipes = get_recipes_from_db(db)
    profile = get_user_profile_from_db(db, current_user.id)

    intent, _ = extract_intent_and_entities(req.query)
    if intent != "suggest_dish":
        fallback_msg = "Try asking what you can cook with the ingredients you have."
        return ChatResponse(
            message=fallback_msg,
            session_id=req.session_id or str(uuid.uuid4()),
            timestamp=datetime.now(timezone.utc).isoformat(),
            recommendations=[],
            history=[
                {"role": "user", "content": req.query},
                {"role": "bot", "content": fallback_msg}
            ]
        )

    filtered = filter_recipes(recipes, profile["pantry"], profile["preferences"])
    ranked = rank_recipes(req.query, filtered, model=nlp_mgr.get_sbert())
    msg = personalize_response(req.query, ranked)
    top_recipes = ranked[:3]

    return ChatResponse(
        message=msg,
        recommendations=[
            RecipeDetail(
                id=r["id"],
                title=r["title"],
                image=None,
                ingredients=r["ingredients"],
                instructions=r["instructions"],
                ready_in_minutes=r["prep_time"],
                servings=r["servings"]
            ) for r in top_recipes
        ],
        session_id=req.session_id or str(uuid.uuid4()),
        timestamp=datetime.now(timezone.utc).isoformat(),
        history=[
            {"role": "user", "content": req.query},
            {"role": "bot", "content": msg}
        ]
    )