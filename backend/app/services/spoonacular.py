import asyncio
from typing import List, Dict, Any
import httpx
from logging import getLogger
from ..core.config import settings

logger = getLogger("uvicorn.error")
API_KEY = settings.SPOONACULAR_API_KEY
BASE = "https://api.spoonacular.com"


async def fetch_recipe_details(recipe_id: int) -> Dict[str, Any]:
    url = f"{BASE}/recipes/{recipe_id}/information"
    params = {"apiKey": API_KEY, "includeNutrition": False}
    async with httpx.AsyncClient() as client:
        r = await client.get(url, params=params, timeout=10)
        r.raise_for_status()
        return r.json()


async def fetch_recipes_online(ingredients: List[str], number: int = 5) -> List[Dict[str, Any]]:
    if not API_KEY:
        raise RuntimeError("Spoonacular API key not configured")

    url = f"{BASE}/recipes/findByIngredients"
    params = {
        "apiKey": API_KEY,
        "ingredients": ",".join(ingredients),
        "number": number,
        "ranking": 1,
        "ignorePantry": False,
    }

    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params, timeout=10)
        resp.raise_for_status()
        hits = resp.json()

    tasks = [fetch_recipe_details(h["id"]) for h in hits]
    details = await asyncio.gather(*tasks, return_exceptions=True)

    out = []
    for h, info in zip(hits, details):
        if isinstance(info, Exception):
            logger.error(f"Error fetching details for {h['id']}: {info}")
            continue

        used = [i["name"] for i in h.get("usedIngredients", [])]
        out.append({
            "id": h["id"],
            "title": h["title"],
            "image": h.get("image"),
            "ingredients": used,
            "instructions": (info.get("instructions") or info.get("summary", "")).replace("<b>", "").replace("</b>", ""),
            "ready_in_minutes": info.get("readyInMinutes", 30),
            "servings": info.get("servings", 4),
        })

    return out
