from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, Text, Float
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship, joinedload
from .base import Base

class User(Base):
    __tablename__ = "users"
    id            = Column(Integer, primary_key=True, index=True)
    username      = Column(String, unique=True, index=True, nullable=False)
    email         = Column(String, unique=True, index=True, nullable=False)
    full_name     = Column(String)
    hashed_password = Column(String, nullable=False)
    is_active     = Column(Boolean, default=True)
    is_verified   = Column(Boolean, default=False)
<<<<<<< HEAD
    favorite_recipes = relationship("FavoriteRecipe", back_populates="user", cascade="all, delete")
=======
    favorites = relationship("FavoriteRecipe", back_populates="user", cascade="all, delete")
    favorite_recipes = relationship("FavoriteRecipe", back_populates="user")
>>>>>>> ca23dc08af9d27adb02a102d31479653c8b874fa
    pantry_items  = relationship("PantryItem", back_populates="user", cascade="all,delete")
    settings      = relationship("UserSettings", uselist=False, back_populates="user", cascade="all,delete")

class UserSettings(Base):
    __tablename__ = "user_settings"
    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    allergies    = Column(JSONB, default=[])
    dislikes     = Column(JSONB, default=[])
    preferences  = Column(JSONB, default=[])
    favorites    = Column(JSONB, default=[])

    user         = relationship("User", back_populates="settings")

class PantryItem(Base):
    __tablename__ = "pantry_items"
    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id"), nullable=False)
    category     = Column(String, nullable=False)
    name         = Column(String, nullable=False)
    temporary  = Column(Boolean, nullable=False, default=False)

    user         = relationship("User", back_populates="pantry_items")

class Recipe(Base):
    __tablename__ = "recipes"
    id               = Column(Integer, primary_key=True, index=True)
    title            = Column(String, nullable=False)
    instructions     = Column(Text, nullable=False)
    prep_time        = Column(Integer, default=30)
    servings         = Column(Integer, default=4)
    cooking_method   = Column(String, default="any")
    diet             = Column(String, default="any")

    recipe_ingredients = relationship(
        "RecipeIngredient", back_populates="recipe", cascade="all,delete"
    )

class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredients"
    recipe_id     = Column(Integer, ForeignKey("recipes.id"), primary_key=True)
    ingredient_id = Column(Integer, ForeignKey("ingredients.id"), primary_key=True)
    quantity      = Column(Float, default=1.0)
    unit          = Column(String, default="unit")

    recipe        = relationship("Recipe", back_populates="recipe_ingredients")
    ingredient    = relationship("Ingredient")

class Ingredient(Base):
    __tablename__ = "ingredients"
    id       = Column(Integer, primary_key=True, index=True)
    name     = Column(String, unique=True, nullable=False)
    category = Column(String)


class FavoriteRecipe(Base):
    __tablename__ = "favorite_recipes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    image = Column(String)
    ready_in_minutes = Column(Integer)
    servings = Column(Integer)
    ingredients = Column(Text)  # spremamo kao JSON string
    instructions = Column(Text)

    user = relationship("User", back_populates="favorite_recipes")