# backend/app/utils/image_downloader.py

import os
import requests
from bs4 import BeautifulSoup
from pathlib import Path
import re
import json
import urllib.parse
from PIL import Image
import io

# ─── Change this line to point at your host-side static folder ───
STATIC_DIR = Path("/home/marko/Desktop/update ChefAI/ChefAI-chat-fix-mobile/static/images")
# Make sure it exists:
STATIC_DIR.mkdir(parents=True, exist_ok=True)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}

def sanitize_filename(title: str) -> str:
    """Create a safe filename from search query"""
    clean = re.sub(r"[^a-zA-Z0-9\s\-]", "", title)
    clean = re.sub(r"\s+", "-", clean.strip())
    clean = re.sub(r"-+", "-", clean)
    return clean.lower().strip("-")[:50] + ".jpg"

def validate_image_url(url: str) -> bool:
    """Check if URL looks like a valid image URL"""
    if not url or not url.startswith(("http://", "https://")):
        return False
    return url.lower().endswith((".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"))

def download_and_convert_image(img_url: str, local_path: Path) -> bool:
    """Download image and convert to JPG if needed"""
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
                bg = Image.new("RGB", img.size, (255,255,255))
                if img.mode == "P":
                    img = img.convert("RGBA")
                bg.paste(img, mask=img.split()[-1])
                img = bg
            elif img.mode != "RGB":
                img = img.convert("RGB")
            img.save(local_path, "JPEG", quality=85, optimize=True)
            return True
        except Exception:
            # fallback: if content was already JPEG
            if content_type in ("image/jpeg", "image/jpg"):
                with open(local_path, "wb") as f:
                    f.write(data)
                return True
            return False

    except Exception:
        return False

def extract_google_image_urls(search_query: str, max_results: int = 5) -> list:
    """Scrape Google Images results for URLs"""
    encoded = urllib.parse.quote_plus(search_query)
    url = f"https://www.google.com/search?q={encoded}&tbm=isch&hl=en"
    try:
        res = requests.get(url, headers=HEADERS, timeout=10)
        res.raise_for_status()
        soup = BeautifulSoup(res.text, "html.parser")
        urls = []

        for script in soup.find_all("script"):
            if script.string and '"ou":' in script.string:
                matches = re.findall(r'"ou":"([^"]+)"', script.string)
                for m in matches:
                    try:
                        decoded = m.encode().decode("unicode_escape")
                        if validate_image_url(decoded):
                            urls.append(decoded)
                            if len(urls) >= max_results:
                                break
                    except:
                        continue
            if len(urls) >= max_results:
                break

        if not urls:
            for img in soup.find_all("img", src=True):
                src = img["src"]
                if validate_image_url(src) and "google" not in src.lower():
                    urls.append(src)
                    if len(urls) >= max_results:
                        break

        return urls[:max_results]
    except Exception:
        return []

def create_default_image(local_path: Path, search_query: str):
    """Generate a placeholder JPEG with text"""
    try:
        from PIL import ImageDraw, ImageFont
        img = Image.new("RGB", (400,300), color=(200,200,200))
        draw = ImageDraw.Draw(img)
        try:
            font = ImageFont.truetype("arial.ttf", 20)
        except:
            font = ImageFont.load_default()
        text = f"Image not found\n{search_query[:30]}..."
        bbox = draw.textbbox((0,0), text, font=font)
        w, h = bbox[2]-bbox[0], bbox[3]-bbox[1]
        x, y = (400-w)//2, (300-h)//2
        draw.text((x,y), text, fill=(100,100,100), font=font)
        img.save(local_path, "JPEG", quality=85)
    except Exception:
        local_path.write_bytes(b"")

def fetch_and_save_jpg(search_query: str) -> str:
    """Main entry: download or generate an image and return its URL path"""
    fn = sanitize_filename(search_query)
    out = STATIC_DIR / fn
    if out.exists() and out.stat().st_size > 0:
        return f"/static/images/{fn}"

    urls = extract_google_image_urls(search_query, max_results=3)
    for url in urls:
        if download_and_convert_image(url, out):
            return f"/static/images/{fn}"

    create_default_image(out, search_query)
    return f"/static/images/{fn}"

# Optionally: Unsplash fallback (see original for details)
