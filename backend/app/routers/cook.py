from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.dependencies import get_db, get_nlp_manager
from app.services.auth import get_current_active_user
from app.schemas.cook import CookRequest, CookResponse
from app.utils.image_downloader import fetch_and_save_jpg  # Import the image downloader
from datetime import datetime
import logging
from slugify import slugify
import os
from pathlib import Path

router = APIRouter(prefix="/cook", tags=["Cook"])
logger = logging.getLogger("chef_ai.cook_rag")

# Define the absolute path to match your image downloader
STATIC_IMAGES_DIR = Path("/home/marko/Desktop/update ChefAI/ChefAI-chat-fix-mobile/backend/app/static/images")

@router.post("/rag", response_model=CookResponse)
def cook_with_rag(
    req: CookRequest,
    db: Session = Depends(get_db),
    nlp_mgr = Depends(get_nlp_manager),
    current_user = Depends(get_current_active_user)
):
    rag_chain = nlp_mgr.get_rag_chain()
    if not rag_chain:
        logger.error("RAG chain is not initialized.")
        raise HTTPException(status_code=503, detail="RAG service unavailable")

    query = f"""
You are a culinary assistant.

User wants to cook a meal for {req.people} people in under {req.prep_time} minutes.

Ingredients always at home: {", ".join(req.always_have)}
Extra ingredients today: {", ".join(req.extras_today)}
Allowed methods: {", ".join(req.allowed_methods)}

User preferences:
- Allergies: {", ".join(req.allergies)}
- Dislikes: {", ".join(req.dislikes)}
- Dietary preferences: {", ".join(req.preferences)}
- Favorites: {", ".join(req.favorites)}

Generate a complete recipe that satisfies these constraints:
1. Recipe title
2. Ingredients list with quantities
3. Step-by-step cooking instructions
4. Estimated preparation time
5. Number of servings
6. A short visual description of how the dish should look

Please format the response with a clear title on the first line.
"""

    try:
        logger.info("Invoking RAG chain with generated prompt")
        result = rag_chain.invoke({"input": query})
    except Exception as e:
        logger.exception("Error while invoking RAG chain")
        raise HTTPException(status_code=500, detail="Failed to generate recipe")

    final_text = result.get("answer") or result.get("output") or ""

    # Extract recipe title for image search
    lines = [line.strip() for line in final_text.split("\n") if line.strip()]
    
    # Try to find a proper title (look for common title patterns)
    recipe_title = "default recipe"
    for line in lines[:5]:  # Check first 5 lines
        # Skip common prefixes and look for actual recipe names
        clean_line = line.strip("# *-1234567890.").strip()
        if (len(clean_line) > 5 and 
            not clean_line.lower().startswith(('ingredients', 'instructions', 'recipe', 'step', 'serves')) and
            not clean_line.endswith(':')):
            recipe_title = clean_line
            break
    
    # Create search query for image
    search_query = f"{recipe_title} food recipe dish"
    
    try:
        # Use the image downloader to fetch and save image
        logger.info(f"Downloading image for recipe: {recipe_title}")
        image_url = fetch_and_save_jpg(search_query)
        logger.info(f"Image saved with URL: {image_url}")
    except Exception as e:
        logger.warning(f"Failed to download image for {recipe_title}: {e}")
        # Fallback to default image
        default_path = STATIC_IMAGES_DIR / "default.jpg"
        if default_path.exists():
            image_url = "/static/images/default.jpg"
        else:
            # Create a very basic default image if none exists
            try:
                from PIL import Image
                img = Image.new('RGB', (400, 300), color=(240, 240, 240))
                default_path.parent.mkdir(parents=True, exist_ok=True)
                img.save(default_path, 'JPEG')
                image_url = "/static/images/default.jpg"
            except:
                image_url = None  # No image available

    return CookResponse(result=final_text.strip(), image_url=image_url)