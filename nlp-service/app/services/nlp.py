from typing import List, Dict, Any, Tuple
import spacy
from sentence_transformers import util

from app.core.nlp_manager import NLPManager

def extract_intent_and_entities(query: str) -> Tuple[str, Dict[str, List[str]]]:
    nlp = NLPManager.get_nlp()
    intent = "unknown"
    entities, keywords = [], []
    if nlp:
        doc = nlp(query.lower())
        if any(tok.lemma_ in {"cook", "make", "prepare", "recipe"} for tok in doc):
            intent = "suggest_dish"
        elif "pantry" in query.lower():
            intent = "manage_pantry"
        entities = [e.text for e in doc.ents]
        keywords = [tok.text for tok in doc if tok.pos_ in {"NOUN", "ADJ"}]
    return intent, {"entities": entities, "keywords": keywords}

def filter_recipes(
    recipes: List[Dict[str, Any]],
    pantry: List[str],
    prefs: Dict[str, Any],
) -> List[Dict[str, Any]]:
    out = []
    threshold = prefs.get("match_threshold", 0.5)
    for r in recipes:
        ingr = set(r["ingredients"])
        if len(ingr & set(pantry)) / max(len(ingr), 1) < threshold:
            continue
        if (dp := prefs.get("dietary_preference", "any")) != "any" and r.get("diet") != dp:
            continue
        if r.get("prep_time", 0) > prefs.get("max_prep_time", 60):
            continue
        if r.get("servings", 0) < prefs.get("min_servings", 1):
            continue
        if (cm := prefs.get("cooking_method", "any")) != "any" and r.get("cooking_method") != cm:
            continue
        out.append(r)
    return out

def rank_recipes(query: str, recipes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    sbert = NLPManager.get_sbert()
    if not sbert or not recipes:
        return recipes
    qemb = sbert.encode(query, convert_to_tensor=True)
    scored = []
    for r in recipes:
        text = f"{r['title']}. {r['instructions']}"
        remb = sbert.encode(text, convert_to_tensor=True)
        score = util.cos_sim(qemb, remb).item()
        scored.append((score, r))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [r for _, r in scored]

def personalize_response(query: str, recipes: List[Dict[str, Any]]) -> str:
    if not recipes:
        return "I couldn't find any recipes matching your criteria."
    if len(recipes) == 1:
        return f"I found the perfect recipe for you: {recipes[0]['title']}!"
    return f"I found {len(recipes)} recipes. Top recommendation is {recipes[0]['title']}!"
