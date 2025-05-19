# /home/marko/IdeaProjects/RAG/langchain-crash-course/chef_ai/backend/app/schemas/pantry.py
from pydantic import BaseModel

class PantryCreate(BaseModel):
    category: str
    name: str
    temporary: bool = False

class PantryOut(PantryCreate):
    id: int
    user_id: int

    class Config:
        from_attributes = True  # Updated from orm_mode = True