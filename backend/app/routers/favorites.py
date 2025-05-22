from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import json

from app.db import models
from app.dependencies import get_db
from app.services.auth import get_current_active_user
from app.schemas.favorite import FavoriteRecipeCreate, FavoriteRecipeOut

router = APIRouter(prefix="/favorites", tags=["Favorites"])

@router.post("/", response_model=FavoriteRecipeOut)
def add_favorite(
    recipe: FavoriteRecipeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    db_recipe = models.FavoriteRecipe(
        user_id=current_user.id,
        title=recipe.title,
        image=recipe.image,
        ready_in_minutes=recipe.ready_in_minutes,
        servings=recipe.servings,
        ingredients=json.dumps(recipe.ingredients),
        instructions=recipe.instructions
    )
    db.add(db_recipe)
    db.commit()
    db.refresh(db_recipe)
    db_recipe.ingredients = json.loads(db_recipe.ingredients)
    return db_recipe

@router.get("/", response_model=List[FavoriteRecipeOut])
def list_favorites(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    recipes = db.query(models.FavoriteRecipe).filter_by(user_id=current_user.id).all()
    for r in recipes:
        r.ingredients = json.loads(r.ingredients)
    return recipes

@router.delete("/{recipe_id}", status_code=204)
def delete_favorite(
    recipe_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    recipe = db.query(models.FavoriteRecipe).filter_by(id=recipe_id, user_id=current_user.id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    db.delete(recipe)
    db.commit()
