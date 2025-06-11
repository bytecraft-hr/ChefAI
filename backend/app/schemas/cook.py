from pydantic import BaseModel
from typing import List, Optional

class CookRequest(BaseModel):
    always_have: List[str]
    extras_today: List[str]
    allowed_methods: List[str]
    prep_time: int
    people: int
    allergies: List[str]
    dislikes: List[str]
    preferences: List[str]
    favorites: List[str]

class CookResponse(BaseModel):
    result: str
    image_url: Optional[str] = None
