from pydantic import BaseModel
from typing import List, Dict, Any

class SettingsData(BaseModel):
    allergies: List[str] = []
    dislikes: List[str] = []
    preferences:  List[str] = []
    favorites: List[Any] = []

    class Config:
        orm_mode = True
