# /home/marko/IdeaProjects/RAG/langchain-crash-course/chef_ai/backend/app/routers/pantry.py
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from ..db.models import PantryItem, User
from ..schemas.pantry import PantryCreate, PantryOut
from ..dependencies import get_db
from ..services.auth import get_current_active_user

router = APIRouter(prefix="/pantry", tags=["Pantry"])

@router.post("/", response_model=PantryOut)
def add_item(
    item: PantryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    # Check if the item already exists for the user (case-insensitive)
    existing = db.query(PantryItem).filter(
        PantryItem.user_id == current_user.id,
        func.lower(PantryItem.name) == item.name.lower()
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Item '{item.name}' already exists in your pantry."
        )

    pi = PantryItem(user_id=current_user.id, **item.dict())
    db.add(pi)
    db.commit()
    db.refresh(pi)
    return pi

@router.get("/", response_model=List[PantryOut])
def list_items(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    return db.query(PantryItem).filter(PantryItem.user_id == current_user.id).all()

@router.delete("/by-name/{name}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item_by_name(
    name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    pi = db.query(PantryItem).filter(
        PantryItem.user_id == current_user.id,
        func.lower(PantryItem.name) == name.lower()
    ).first()

    if not pi:
        raise HTTPException(status_code=404, detail="Item not found")

    db.delete(pi)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

# Add a new route to delete by ID for better RESTful design
@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item_by_id(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    pi = db.query(PantryItem).filter(
        PantryItem.user_id == current_user.id,
        PantryItem.id == item_id
    ).first()

    if not pi:
        raise HTTPException(status_code=404, detail="Item not found")

    db.delete(pi)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)