from pydantic import BaseModel
from typing import List, Optional

class FavoriteRecipeBase(BaseModel):
    title: str
    image: Optional[str] = None
    ready_in_minutes: int
    servings: int
    ingredients: List[str]
    instructions: str

# Za unos iz frontenda
class FavoriteRecipeCreate(FavoriteRecipeBase):
    pass

# Za slanje prema frontendu
class FavoriteRecipeOut(FavoriteRecipeBase):
    id: int
    user_id: int

    model_config = {
        "from_attributes": True  # ekvivalent orm_mode u Pydantic v2
    }
