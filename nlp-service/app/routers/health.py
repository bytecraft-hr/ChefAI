from fastapi import APIRouter
from datetime import datetime

router = APIRouter(tags=["Health"])

@router.get("/ping")
async def ping():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}
