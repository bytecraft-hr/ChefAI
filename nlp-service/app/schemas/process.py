from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class ProcessRequest(BaseModel):
    query: str
    user_id: str
    session_id: Optional[str] = None
    mode: str = "rule"   # "rule" | "rag"

class ProcessResponse(BaseModel):
    message: str
    recommendations: Optional[List[Dict[str, Any]]] = None
    session_id: Optional[str] = None
    timestamp: Optional[str] = None
