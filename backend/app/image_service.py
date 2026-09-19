import os
import io
import re
import logging
import httpx
from typing import Optional, List
from PIL import Image
from app.config import settings

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
}

def search_ddg_grocery_images(product_name: str) -> List[str]:
    """
    Search DuckDuckGo using primp TLS client.
    Returns direct product pack shots from Amazon, BigBasket, IndiaMART, etc.
    """
    candidates = []
    try:
        import primp
        client = primp.Client()
        clean_q = re.sub(r"[^\w\s]", " ", product_name).strip()
        search_query = f"{clean_q} grocery product pack"
        
        url = f"https://duckduckgo.com/?q={search_query.replace(' ', '+')}&iax=images&ia=images"
        r = client.get(url)
        vqd_match = re.search(r'vqd=([0-9-_]+)', r.text) or re.search(r'vqd="([0-9-_]+)"', r.text)
        if not vqd_match:
            return []
        
        vqd = vqd_match.group(1)
        i_url = f"https://duckduckgo.com/i.js?l=wt-wt&o=json&q={search_query.replace(' ', '+')}&vqd={vqd}&f=,,,"
        r2 = client.get(i_url)
        if r2.status_code == 200:
            data = r2.json()
            results = data.get("results", [])
            for res in results[:15]:
                img = res.get("image")
                if img and any(ext in img.lower() for ext in [".jpg", ".jpeg", ".png"]):
                    # Avoid vector / meme / generic logos
                    if not any(bad in img.lower() for bad in ["meme", "facebook", "twitter", "reddit"]):
                        candidates.append(img)
    except Exception as e:
        logger.warning(f"DDG grocery image search notice for '{product_name}': {e}")

    return candidates

def search_wikimedia_grocery_images(product_name: str) -> List[str]:
    """Search Wikimedia Commons for grocery item photos (namespace 6 = media files)."""
    candidates = []
    try:
        clean_q = re.sub(r"[^\w\s]", " ", product_name).strip()
        w_url = f"https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch={clean_q}&gsrnamespace=6&prop=imageinfo&iiprop=url&iiurlwidth=500&format=json"
        r = httpx.get(w_url, headers={"User-Agent": "KiranaMitra/1.0 (kirana@mitra.ai)"}, follow_redirects=True, timeout=4.0)
        if r.status_code == 200:
            pages = r.json().get("query", {}).get("pages", {})
            for p in pages.values():
                title = p.get("title", "").lower()
                ii = p.get("imageinfo", [{}])[0]
                thumb = ii.get("thumburl") or ii.get("url")
                if thumb and any(ext in thumb.lower() for ext in [".jpg", ".jpeg", ".png"]):
                    if not any(bad in title for bad in ["svg", "bus", "car", "map", "flag", "icon", "logo", "painting"]):
                        candidates.append(thumb)
    except Exception as e:
        logger.warning(f"Wikimedia search notice for '{product_name}': {e}")

    return candidates

def download_and_save_product_image(image_url: str, slug: str) -> Optional[str]:
    """Downloads remote image, center-crops to square 512x512, and saves to uploads dir."""
    try:
        r = httpx.get(image_url, headers=HEADERS, follow_redirects=True, timeout=6.0)
        if r.status_code != 200 or len(r.content) < 1000:
            return None

        image = Image.open(io.BytesIO(r.content)).convert("RGB")
        
        # Center crop square
        w, h = image.size
        min_dim = min(w, h)
        left = (w - min_dim) // 2
        top = (h - min_dim) // 2
        right = left + min_dim
        bottom = top + min_dim
        image = image.crop((left, top, right, bottom))
        image = image.resize((512, 512), Image.Resampling.LANCZOS)

        filename = f"{slug}.jpg"
        save_path = os.path.join(settings.UPLOAD_DIR, filename)
        image.save(save_path, "JPEG", quality=90)
        logger.info(f"Successfully downloaded & saved authentic product image: {save_path}")
        return f"/assets/uploads/{filename}"
    except Exception as e:
        logger.debug(f"Could not open image from {image_url}: {e}")
        return None

def get_or_fetch_product_image(product_name: str, slug: str, camera_b64: Optional[str] = None, search_term: Optional[str] = None) -> str:
    """
    Core implementation:
    1. First, search and fetch the authentic product image from the internet.
    2. If found and downloaded successfully, use the internet image.
    3. If internet image is unavailable or fails:
       - If camera image was provided, use the captured camera snapshot.
       - Otherwise, fallback to pre-generated icon or unknown.png.
    """
    query_str = search_term or product_name
    logger.info(f"Fetching internet product image for: '{product_name}' ({slug}) using query: '{query_str}'...")

    # Step 1: Collect candidates from DDG grocery search and Wikimedia
    candidates = search_ddg_grocery_images(query_str)
    if not candidates and query_str != product_name:
        candidates = search_ddg_grocery_images(product_name)
    if not candidates:
        candidates = search_wikimedia_grocery_images(query_str)

    # Step 2: Try downloading from candidates until a valid product image is saved
    for c_url in candidates:
        saved_path = download_and_save_product_image(c_url, slug)
        if saved_path:
            return saved_path

    logger.info(f"No usable internet image found for '{product_name}'. Checking fallback sources...")

    # Step 3: If camera image was provided, use camera snapshot
    if camera_b64:
        from app.product_service import save_camera_frame_as_thumbnail
        logger.info(f"Using captured camera frame for new product: {slug}")
        return save_camera_frame_as_thumbnail(camera_b64, slug)

    # Step 4: Check if pre-generated icon exists in catalog assets
    icon_path = os.path.join(settings.PRODUCTS_ASSETS_DIR, f"{slug}.png")
    if os.path.exists(icon_path):
        return f"/assets/products/{slug}.png"

    # Step 5: Final fallback placeholder
    return "/assets/products/unknown.png"
