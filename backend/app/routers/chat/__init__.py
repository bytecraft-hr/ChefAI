from fastapi import APIRouter
from .online import router as online_router
from .rag    import router as rag_router
from .rule   import router as rule_router

router = APIRouter(prefix="/chat")
router.include_router(online_router, prefix="/online")
router.include_router(rag_router,    prefix="/rag")
router.include_router(rule_router,   prefix="/rule")
