import os
import json
import logging
import httpx
import asyncio
from typing import Optional, Dict, Any, Tuple
from app.config import settings

logger = logging.getLogger(__name__)

CANDIDATE_MODELS = ["gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.5-flash-lite", "gemini-2.5-flash"]

async def call_gemini(
    system_prompt: str,
    user_content: str,
    image_b64: Optional[str] = None,
    model_name: str = "gemini-3.8-live",
    is_json_expected: bool = True,
    timeout_seconds: float = 8.0
) -> Tuple[Optional[str], Optional[Dict[str, Any]]]:
    """
    Call Gemini API (Gemini 3.8 Live / Gemini 3.5 Live Translate)
    Supports high-speed multimodal item recognition and Telugu voice parsing.
    """
    api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "") or os.getenv("GOOGLE_API_KEY", "")
    
    if not api_key:
        logger.info("GEMINI_API_KEY not set. Using high-fidelity local Kirana reasoning engine.")
        return None, None

    # Determine mime type and clean base64 data
    parts = []
    if user_content:
        parts.append({"text": user_content})

    if image_b64:
        mime = "image/png" if "image/png" in image_b64 else "image/jpeg"
        clean_b64 = image_b64.split(",")[-1].strip() if "," in image_b64 else image_b64.strip()
        parts.append({
            "inline_data": {
                "mime_type": mime,
                "data": clean_b64
            }
        })

    payload = {
        "contents": [{"parts": parts}],
        "system_instruction": {
            "parts": [{"text": system_prompt}]
        },
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 1024
        }
    }

    if is_json_expected:
        payload["generationConfig"]["response_mime_type"] = "application/json"

    # Try candidate models with fast failover
    for candidate in CANDIDATE_MODELS:
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{candidate}:generateContent?key={api_key}"
        try:
            async with httpx.AsyncClient(timeout=timeout_seconds) as client:
                response = await client.post(endpoint, json=payload)
                if response.status_code == 404 or response.status_code == 503:
                    logger.warning(f"Model {candidate} returned status {response.status_code}. Trying next candidate...")
                    continue
                response.raise_for_status()
                data = response.json()
                
                candidates = data.get("candidates", [])
                if not candidates:
                    continue

                content_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                
                if not is_json_expected:
                    return content_text, None

                # Parse JSON
                try:
                    parsed = json.loads(content_text)
                    return content_text, parsed
                except Exception:
                    from app.diffusion_gemma import clean_and_parse_json
                    parsed = clean_and_parse_json(content_text)
                    return content_text, parsed

        except Exception as e:
            logger.warning(f"Error calling Gemini API ({candidate}): {e}")
            continue

    return None, None
    
PRODUCT_CANONICAL_PROMPT = """You are an expert Indian Kirana grocery entity resolution engine.
Given a grocery product name or query spoken in Telugu, Hindi, Indian English, or mixed Kirana dialect:
Your task:
1. canonical_name: The clean, standardized English brand and product name (e.g. 'Coca-Cola Zero Sugar Can', 'Maggi 2-Minute Noodles', 'Aashirvaad Whole Wheat Atta', 'Tata Iodized Salt', 'Fortune Sunflower Cooking Oil', 'Horlicks Health Drink', 'Parle-G Biscuits').
2. telugu_name: Natural Telugu name in Telugu script (e.g. 'కోకోకోలా జీరో క్యాన్', 'మ్యాగీ నూడుల్స్', 'ఆశీర్వాద్ గోధుమ పిండి').
3. hindi_name: Natural Hindi name in Devanagari script (e.g. 'कोका-कोला ज़ीरो कैन', 'मैगी नूडल्स', 'आशीर्वाद गेहूं आटा').
4. unit: Appropriate Kirana packaging unit ('bags', 'kg', 'bottles', 'packets', 'bars', 'cans').
5. category: One of 'Grains & Staples', 'Pulses & Dals', 'Oils & Ghee', 'Snacks & Packaged', 'Beverages', 'Personal Care', 'Household & Cleaning', or 'General Grocery'.
6. search_query: Optimal e-commerce product packaging search phrase for pack shots (e.g. 'Coca-Cola Zero Sugar 300ml can packshot').

Return ONLY a strict JSON object:
{
  "canonical_name": string,
  "telugu_name": string,
  "hindi_name": string,
  "unit": string,
  "category": string,
  "search_query": string
}
Do NOT wrap with backticks or explanations.
"""

async def canonicalize_product_name(raw_name: str) -> Dict[str, Any]:
    """
    Multilingual Cross-Lingual Entity Resolution via Gemini Live.
    Resolves Telugu/Hindi/transliterated input into canonical English and native scripts.
    """
    if not raw_name or not raw_name.strip():
        return {}
        
    cleaned = raw_name.strip()
    try:
        _, parsed = await call_gemini(
            system_prompt=PRODUCT_CANONICAL_PROMPT,
            user_content=f"Product utterance: \"{cleaned}\"",
            model_name="gemini-2.5-flash",
            is_json_expected=True,
            timeout_seconds=4.0
        )
        if parsed and isinstance(parsed, dict) and "canonical_name" in parsed:
            return parsed
    except Exception as e:
        logger.warning(f"Error in canonicalize_product_name: {e}")
        
    return {
        "canonical_name": cleaned.title(),
        "telugu_name": cleaned if any('\u0c00' <= c <= '\u0c7f' for c in cleaned) else None,
        "hindi_name": cleaned if any('\u0900' <= c <= '\u097f' for c in cleaned) else None,
        "unit": "packets",
        "category": "General Grocery",
        "search_query": f"{cleaned} grocery product packet"
    }

def canonicalize_product_name_sync(raw_name: str) -> Dict[str, Any]:
    """Synchronous bridge for canonicalize_product_name."""
    try:
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                return pool.submit(asyncio.run, canonicalize_product_name(raw_name)).result(timeout=5.0)
        else:
            return loop.run_until_complete(canonicalize_product_name(raw_name))
    except Exception as e:
        logger.warning(f"Sync canonicalization fallback notice: {e}")
        cleaned = raw_name.strip()
        return {
            "canonical_name": cleaned.title(),
            "telugu_name": None,
            "hindi_name": None,
            "unit": "packets",
            "category": "General Grocery",
            "search_query": f"{cleaned} grocery product packshot"
        }

