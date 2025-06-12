import os
import requests
from pathlib import Path
from duckduckgo_search import DDGS
from PIL import Image, ImageDraw, ImageFont
import io
import re

# Directory inside Docker container (linked to local ./static/images)
STATIC_DIR = Path("/app/static/images")
STATIC_DIR.mkdir(parents=True, exist_ok=True)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
}

def sanitize_filename(title: str) -> str:
    clean = re.sub(r"[^a-zA-Z0-9\s\-]", "", title)
    clean = re.sub(r"\s+", "-", clean.strip())
    clean = re.sub(r"-+", "-", clean)
    return clean.lower().strip("-")[:50] + ".jpg"

def validate_image_url(url: str) -> bool:
    if not url or not url.startswith(("http://", "https://")):
        return False
    return url.lower().endswith((".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"))

def download_and_convert_image(img_url: str, local_path: Path) -> bool:
    try:
        resp = requests.get(img_url, headers=HEADERS, timeout=10, stream=True)
        resp.raise_for_status()
        content_type = resp.headers.get("content-type", "").lower()
        if not content_type.startswith("image/"):
            return False
        data = resp.content

        try:
            img = Image.open(io.BytesIO(data))
            if img.mode in ("RGBA", "LA", "P"):
                bg = Image.new("RGB", img.size, (255, 255, 255))
                if img.mode == "P":
                    img = img.convert("RGBA")
                bg.paste(img, mask=img.split()[-1])
                img = bg
            elif img.mode != "RGB":
                img = img.convert("RGB")
            img.save(local_path, "JPEG", quality=85, optimize=True)
            return True
        except Exception as e:
            if content_type in ("image/jpeg", "image/jpg"):
                with open(local_path, "wb") as f:
                    f.write(data)
                return True
            print(f"[Pillow error] {img_url}: {e}")
            return False

    except requests.exceptions.RequestException as e:
        print(f"[Request failed] {img_url}: {e}")
        return False
    except Exception as e:
        print(f"[Unexpected error] {img_url}: {e}")
        return False

def create_default_image(local_path: Path, search_query: str):
    try:
        img = Image.new("RGB", (400, 300), color=(200, 200, 200))
        draw = ImageDraw.Draw(img)
        try:
            font = ImageFont.truetype("arial.ttf", 20)
        except IOError:
            font = ImageFont.load_default()
        text_lines = ["Image not found", f"{search_query[:40]}..."]
        full_text = "\n".join(text_lines)
        bbox = draw.textbbox((0, 0), full_text, font=font)
        x = (img.width - (bbox[2] - bbox[0])) // 2
        y = (img.height - (bbox[3] - bbox[1])) // 2
        draw.text((x, y), full_text, fill=(100, 100, 100), font=font, align="center")
        img.save(local_path, "JPEG", quality=85)
        print(f"[Default created] {local_path}")
    except Exception as e:
        print(f"[Default image error] {search_query}: {e}")
        local_path.write_bytes(b"")

def fetch_and_save_jpg(search_query: str) -> str:
    filename = sanitize_filename(search_query)
    output_path = STATIC_DIR / filename

    if output_path.exists() and output_path.stat().st_size > 0:
        print(f"✅ Image already exists: {output_path}")
        return f"/static/images/{filename}"

    print(f"🔍 Searching DuckDuckGo for: '{search_query}'")
    try:
        with DDGS() as ddgs:
            results = ddgs.images(search_query, safesearch="Moderate", max_results=5)
            for result in results:
                img_url = result.get("image")
                if validate_image_url(img_url):
                    print(f"➡️ Trying image: {img_url}")
                    if download_and_convert_image(img_url, output_path):
                        print(f"✅ Downloaded and saved: {output_path}")
                        return f"/static/images/{filename}"
    except Exception as e:
        print(f"❌ DuckDuckGo image search failed: {e}")

    print(f"⚠️ No valid image found. Creating default image for '{search_query}'")
    create_default_image(output_path, search_query)
    return f"/static/images/{filename}"
