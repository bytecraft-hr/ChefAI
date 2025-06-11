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

# Change this line:
# STATIC_DIR = Path("/home/marko/Desktop/update ChefAI/ChefAI-chat-fix-mobile/backend/app/static/images")
STATIC_DIR = Path("/app/static/images") # This is the path INSIDE the Docker container
STATIC_DIR.mkdir(parents=True, exist_ok=True) # Ensure this directory exists when the container starts

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
    # Remove special characters and replace with hyphens
    clean = re.sub(r"[^a-zA-Z0-9\s\-]", "", title)
    clean = re.sub(r"\s+", "-", clean.strip())
    clean = re.sub(r"-+", "-", clean)
    return clean.lower().strip("-")[:50] + ".jpg"  # Limit length

def validate_image_url(url: str) -> bool:
    """Check if URL looks like a valid image URL"""
    if not url or not url.startswith(('http://', 'https://')):
        return False
    
    # Check for common image extensions
    image_extensions = ('.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp')
    return any(url.lower().endswith(ext) for ext in image_extensions)

def download_and_convert_image(img_url: str, local_path: Path) -> bool:
    """Download image and convert to JPG if needed"""
    try:
        img_response = requests.get(img_url, headers=HEADERS, timeout=10, stream=True)
        img_response.raise_for_status()
        
        # Check if content is actually an image
        content_type = img_response.headers.get('content-type', '').lower()
        if not content_type.startswith('image/'):
            return False
        
        # Load image data
        image_data = img_response.content
        
        # Convert to JPG using PIL
        try:
            image = Image.open(io.BytesIO(image_data))
            # Convert to RGB if necessary (for PNG with transparency, etc.)
            if image.mode in ('RGBA', 'LA', 'P'):
                rgb_image = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'P':
                    image = image.convert('RGBA')
                rgb_image.paste(image, mask=image.split()[-1] if 'A' in image.mode else None)
                image = rgb_image
            elif image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Save as JPG
            image.save(local_path, 'JPEG', quality=85, optimize=True)
            return True
            
        except Exception as e:
            print(f"❌ Error processing image: {e}")
            # Fallback: save raw data if it's already a JPG
            if content_type in ('image/jpeg', 'image/jpg'):
                with open(local_path, "wb") as f:
                    f.write(image_data)
                return True
            return False
            
    except Exception as e:
        print(f"❌ Error downloading image: {e}")
        return False

def extract_google_image_urls(search_query: str, max_results: int = 5) -> list:
    """Extract image URLs from Google Images search"""
    encoded_query = urllib.parse.quote_plus(search_query)
    url = f"https://www.google.com/search?q={encoded_query}&tbm=isch&hl=en"
    
    try:
        response = requests.get(url, headers=HEADERS, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, "html.parser")
        image_urls = []
        
        # Method 1: Look for JSON data in script tags
        script_tags = soup.find_all("script")
        for script in script_tags:
            if script.string and "\"ou\":" in script.string:
                try:
                    # Extract JSON-like data containing image URLs
                    script_content = script.string
                    # Find all "ou":"URL" patterns
                    matches = re.findall(r'"ou":"([^"]+)"', script_content)
                    for match in matches:
                        # Decode URL
                        try:
                            decoded_url = match.encode().decode('unicode_escape')
                            if validate_image_url(decoded_url):
                                image_urls.append(decoded_url)
                                if len(image_urls) >= max_results:
                                    break
                        except:
                            continue
                except:
                    continue
                
                if len(image_urls) >= max_results:
                    break
        
        # Method 2: Fallback - look for img tags (less reliable)
        if not image_urls:
            img_tags = soup.find_all("img", {"src": True})
            for img in img_tags:
                src = img.get("src")
                if validate_image_url(src) and "google" not in src.lower():
                    image_urls.append(src)
                    if len(image_urls) >= max_results:
                        break
        
        return image_urls[:max_results]
        
    except Exception as e:
        print(f"❌ Error searching for images: {e}")
        return []

def create_default_image(local_path: Path, search_query: str):
    """Create a simple default image with text"""
    try:
        from PIL import Image, ImageDraw, ImageFont
        
        # Create a simple colored rectangle
        img = Image.new('RGB', (400, 300), color=(200, 200, 200))
        draw = ImageDraw.Draw(img)
        
        # Add text
        try:
            # Try to use a default font
            font = ImageFont.truetype("arial.ttf", 20)
        except:
            font = ImageFont.load_default()
        
        text = f"Image not found\n{search_query[:30]}..."
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        x = (400 - text_width) // 2
        y = (300 - text_height) // 2
        
        draw.text((x, y), text, fill=(100, 100, 100), font=font)
        
        img.save(local_path, 'JPEG', quality=85)
        
    except Exception as e:
        print(f"❌ Error creating default image: {e}")
        # Create minimal default file
        with open(local_path, "wb") as f:
            f.write(b"")

def fetch_and_save_jpg(search_query: str) -> str:
    """
    Fetch an image based on search query and save it as JPG
    Returns the relative path to the saved image
    """
    filename = sanitize_filename(search_query)
    local_path = STATIC_DIR / filename

    # Return existing file if found
    if local_path.exists() and local_path.stat().st_size > 0:
        return f"/static/images/{filename}"

    print(f"🔍 Searching for image: {search_query}")
    
    # Get image URLs from search
    image_urls = extract_google_image_urls(search_query, max_results=3)
    
    if not image_urls:
        print(f"❌ No images found for: {search_query}")
        create_default_image(local_path, search_query)
        return f"/static/images/{filename}"
    
    # Try to download images
    for i, img_url in enumerate(image_urls):
        print(f"🔄 Trying image {i+1}/{len(image_urls)}: {img_url[:60]}...")
        
        if download_and_convert_image(img_url, local_path):
            print(f"✅ Successfully downloaded image for: {search_query}")
            return f"/static/images/{filename}"
        else:
            print(f"❌ Failed to download image {i+1}")
    
    # If all downloads failed, create default image
    print(f"❌ All download attempts failed for: {search_query}")
    create_default_image(local_path, search_query)
    return f"/static/images/{filename}"

# Alternative function using a more reliable image search API
def fetch_and_save_jpg_unsplash(search_query: str, access_key: str = None) -> str:
    """
    Alternative implementation using Unsplash API (requires API key)
    More reliable but requires registration at https://unsplash.com/developers
    """
    filename = sanitize_filename(search_query)
    local_path = STATIC_DIR / filename

    if local_path.exists() and local_path.stat().st_size > 0:
        return f"/static/images/{filename}"

    if not access_key:
        print("❌ Unsplash access key not provided")
        return fetch_and_save_jpg(search_query)  # Fallback to Google search

    try:
        url = "https://api.unsplash.com/search/photos"
        params = {
            "query": search_query,
            "per_page": 1,
            "orientation": "landscape"
        }
        headers = {"Authorization": f"Client-ID {access_key}"}
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        if data.get("results"):
            img_url = data["results"][0]["urls"]["regular"]
            if download_and_convert_image(img_url, local_path):
                print(f"✅ Downloaded from Unsplash: {search_query}")
                return f"/static/images/{filename}"
        
        print(f"❌ No suitable images found on Unsplash for: {search_query}")
        
    except Exception as e:
        print(f"❌ Unsplash API error: {e}")
    
    # Fallback to Google search
    return fetch_and_save_jpg(search_query)