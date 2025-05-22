from typing import List, Dict, Any
import psycopg2
from psycopg2.extensions import connection

def get_recipes(conn: connection) -> List[Dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute("""
            SELECT r.id, r.title, r.prep_time, r.servings, r.cooking_method,
                   r.instructions, r.diet, array_agg(i.name) AS ingredients
              FROM recipes r
              JOIN recipe_ingredients ri ON r.id = ri.recipe_id
              JOIN ingredients i ON ri.ingredient_id = i.id
          GROUP BY r.id
        """)
        return cur.fetchall()

def get_user_profile(conn: connection, user_id: str) -> Dict[str, Any]:
    # preferences
    with conn.cursor() as cur:
        cur.execute(
            "SELECT dietary_preference, max_prep_time, min_servings, cooking_method "
            "FROM user_preferences WHERE user_id = %s",
            (user_id,)
        )
        prefs = cur.fetchone() or {}
    # pantry
    with conn.cursor() as cur:
        cur.execute("SELECT name FROM pantry_items WHERE user_id = %s", (user_id,))
        pantry = [r["name"] for r in cur.fetchall()]

    return {
        "preferences": prefs or {
            "dietary_preference": "any",
            "max_prep_time": 60,
            "min_servings": 1,
            "cooking_method": "any",
        },
        "pantry": pantry or [],
    }
