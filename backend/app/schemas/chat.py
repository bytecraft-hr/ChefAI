from pydantic import BaseModel
from typing import List, Optional, Literal


class ChatRequest(BaseModel):
    query: str
    mode: Literal["rule", "rag", "online"] = "rule"
    session_id: Optional[str] = None


class ChatMessage(BaseModel):
    role: Literal["user", "bot"]
    content: str


class RecipeDetail(BaseModel):
    id: int
    title: str
    image: Optional[str]
    ingredients: List[str]
    instructions: str
    ready_in_minutes: int
    servings: int


class ChatResponse(BaseModel):
    message: str
    recommendations: List[RecipeDetail] = []
    session_id: str
    timestamp: str
    history: Optional[List[ChatMessage]] = []

    class Config:
        from_attributes = True
