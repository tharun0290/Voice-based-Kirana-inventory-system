import os
import re
import base64
import logging
from io import BytesIO
from typing import Optional, Tuple, List
from PIL import Image
from rapidfuzz import fuzz, process
from sqlalchemy.orm import Session
from app.models import Product, InventoryTransaction
from app.config import settings

logger = logging.getLogger(__name__)

# Known transliteration dictionary for Telugu / Hindi Kirana terms
TRANSLITERATION_MAP = {
    # Native Telugu Script
    "బియ్యం": "Rice",
    "బియ్యము": "Rice",
    "రైస్": "Rice",
    "సోనా మసూరి": "Rice",
    "పప్పు": "Dal / Lentils",
    "కందిపప్పు": "Dal / Lentils",
    "కంది పప్పు": "Dal / Lentils",
    "దాల్": "Dal / Lentils",
    "నూనె": "Cooking Oil",
    "వంట నూనె": "Cooking Oil",
    "ఆయిల్": "Cooking Oil",
    "చక్కెర": "Sugar",
    "చెక్కెర": "Sugar",
    "పంచదార": "Sugar",
    "బిస్కెట్లు": "Biscuits",
    "బిస్కెట్": "Biscuits",
    "సబ్బు": "Soap",
    "సబ్బులు": "Soap",
    "ఉప్పు": "Salt",
    "టీ పొడి": "Tea Powder",
    "టీపొడి": "Tea Powder",
    "చాయాపొడి": "Tea Powder",
    "గోధుమ పిండి": "Atta / Wheat Flour",
    "గోధుమపిండి": "Atta / Wheat Flour",
    "ఆటా": "Atta / Wheat Flour",
    "సబ్బు పొడి": "Detergent Powder",
    "సబ్బుపొడి": "Detergent Powder",
    "సర్ఫ్": "Detergent Powder",
    "మ్యాగీ": "Maggi Noodles",
    # Latin Transliteration
    "biyyam": "Rice",
    "biyyamu": "Rice",
    "rice": "Rice",
    "pappu": "Dal / Lentils",
    "kandi pappu": "Dal / Lentils",
    "dal": "Dal / Lentils",
    "lentils": "Dal / Lentils",
    "nune": "Cooking Oil",
    "oil": "Cooking Oil",
    "cooking oil": "Cooking Oil",
    "panchadara": "Sugar",
    "chekkera": "Sugar",
    "sugar": "Sugar",
    "biscuit": "Biscuits",
    "biscuits": "Biscuits",
    "sabbu": "Soap",
    "soap": "Soap",
    "uppu": "Salt",
    "salt": "Salt",
    "chayapodi": "Tea Powder",
    "tea": "Tea Powder",
    "tea powder": "Tea Powder",
    "chai": "Tea Powder",
    "godhuma pindi": "Atta / Wheat Flour",
    "atta": "Atta / Wheat Flour",
    "wheat flour": "Atta / Wheat Flour",
    "sabbu podi": "Detergent Powder",
    "detergent": "Detergent Powder",
    "surf": "Detergent Powder",
    "washing powder": "Detergent Powder",
    "maggi": "Maggi Noodles",
    "noodles": "Maggi Noodles"
}

def normalize_text(text: str) -> str:
    """Normalize string by lowercasing, removing punctuation while preserving unicode words."""
    if not text:
        return ""
    cleaned = re.sub(r"[^\w\s]", " ", text.lower(), flags=re.UNICODE).strip()
    return re.sub(r"\s+", " ", cleaned)

def find_matching_product(db: Session, raw_query: str, threshold: float = 70.0) -> Optional[Product]:
    """
    Fuzzy resolve raw product query against existing products table.
    Uses transliteration aliases and rapidfuzz token_set_ratio.
    """
    norm_query = normalize_text(raw_query)
    if not norm_query:
        return None

    # 1. Direct transliteration alias check
    if norm_query in TRANSLITERATION_MAP:
        target_name = normalize_text(TRANSLITERATION_MAP[norm_query])
    else:
        target_name = norm_query

    products: List[Product] = db.query(Product).all()
    if not products:
        return None

    # 2. Build candidate lookup
    candidate_dict = {}
    for p in products:
        p_norm = normalize_text(p.name)
        if p_norm:
            candidate_dict[p_norm] = p
        if p.telugu_name:
            t_norm = normalize_text(p.telugu_name)
            if t_norm:
                candidate_dict[t_norm] = p
        if p.hindi_name:
            h_norm = normalize_text(p.hindi_name)
            if h_norm:
                candidate_dict[h_norm] = p

    choices = list(candidate_dict.keys())
    match_result = process.extractOne(
        target_name,
        choices,
        scorer=fuzz.token_set_ratio,
        score_cutoff=threshold
    )

    if match_result:
        matched_str, score, _ = match_result
        matched_prod = candidate_dict[matched_str]
        logger.info(f"Fuzzy matched '{raw_query}' -> '{matched_prod.name}' with score {score}")
        return matched_prod

    # 3. Substring match fallback (only for substantial queries)
    if len(target_name) >= 4:
        for c_str, prod in candidate_dict.items():
            if len(c_str) >= 4 and target_name in c_str:
                logger.info(f"Substring matched '{raw_query}' -> '{prod.name}'")
                return prod

    # 4. Cross-Lingual Gemini Entity Canonicalization
    # If raw_query has non-ASCII script or failed direct lookup, canonicalize via Gemini
    has_non_ascii = any(ord(c) > 127 for c in raw_query)
    if has_non_ascii or len(norm_query.split()) > 1:
        try:
            from app.gemini_service import canonicalize_product_name_sync
            canon_data = canonicalize_product_name_sync(raw_query)
            if canon_data and "canonical_name" in canon_data:
                c_name = normalize_text(canon_data["canonical_name"])
                c_match = process.extractOne(
                    c_name,
                    choices,
                    scorer=fuzz.token_set_ratio,
                    score_cutoff=threshold
                )
                if c_match:
                    matched_str, score, _ = c_match
                    matched_prod = candidate_dict[matched_str]
                    logger.info(f"Cross-lingual entity match '{raw_query}' -> '{canon_data['canonical_name']}' -> '{matched_prod.name}' ({score}%)")
                    updated = False
                    if not matched_prod.telugu_name and canon_data.get("telugu_name"):
                        matched_prod.telugu_name = canon_data["telugu_name"]
                        updated = True
                    if not matched_prod.hindi_name and canon_data.get("hindi_name"):
                        matched_prod.hindi_name = canon_data["hindi_name"]
                        updated = True
                    if updated:
                        db.commit()
                    return matched_prod
        except Exception as e:
            logger.warning(f"Cross-lingual entity match notice: {e}")

    return None

def save_camera_frame_as_thumbnail(image_b64: str, slug: str) -> str:
    """
    Saves a captured camera frame as a square product thumbnail in /assets/uploads/{slug}.jpg.
    Crops and resizes to 512x512.
    """
    try:
        clean_b64 = image_b64.split(",")[-1].strip() if "," in image_b64 else image_b64.strip()
        img_bytes = base64.b64decode(clean_b64)
        image = Image.open(BytesIO(img_bytes)).convert("RGB")
        
        # Center-crop square
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
        return f"/assets/uploads/{filename}"
    except Exception as e:
        logger.error(f"Error saving camera frame thumbnail: {e}")
        return "/assets/products/unknown.png"

def resolve_and_apply_stock(
    db: Session,
    intent: str,
    raw_product: str,
    quantity: float,
    unit: Optional[str] = None,
    source: str = "VOICE",
    image_b64: Optional[str] = None,
    voice_transcript: Optional[str] = None
) -> Tuple[str, Optional[Product], str]:
    """
    Executes Step 4 of the specification:
    - Fuzzy matches product
    - If match found: updates stock (ADD or REMOVE)
    - If no match found and intent == 'ADD_STOCK': auto-creates product row + stores camera photo or fallback icon
    - If no match found and intent == 'REMOVE_STOCK': rejects with friendly notice
    Returns: (action, product, message)
      action: "stock_updated" | "new_product_created" | "error"
    """
    matched_product = find_matching_product(db, raw_product)

    # 1. Product found -> Update stock
    if matched_product:
        qty_val = float(quantity)
        if intent == "ADD_STOCK":
            matched_product.current_stock += qty_val
            tx_type = "ADD"
            msg = f"✅ Stock updated: {matched_product.name} (+{qty_val} {unit or matched_product.unit}). Total: {matched_product.current_stock} {matched_product.unit}."
        elif intent == "REMOVE_STOCK":
            matched_product.current_stock = max(0.0, matched_product.current_stock - qty_val)
            tx_type = "REMOVE"
            msg = f"🔻 Stock reduced: {matched_product.name} (-{qty_val} {unit or matched_product.unit}). Remaining: {matched_product.current_stock} {matched_product.unit}."
        else:
            return "error", None, f"Unknown intent: {intent}"

        # Record transaction
        tx = InventoryTransaction(
            product_id=matched_product.id,
            type=tx_type,
            source=source,
            quantity=qty_val,
            unit=unit or matched_product.unit,
            voice_transcript=voice_transcript,
            notes=f"Processed from {source.lower()} command."
        )
        db.add(tx)
        db.commit()
        db.refresh(matched_product)
        return "stock_updated", matched_product, msg

    # 2. Product NOT found initially -> Check with canonicalized name before rejecting or creating!
    from app.gemini_service import canonicalize_product_name_sync
    canon_info = canonicalize_product_name_sync(raw_product)
    canon_name = canon_info.get("canonical_name") or raw_product.strip().title()

    # Double check if canon_name matches an existing product in the catalog
    if canon_name.lower() != raw_product.lower():
        secondary_match = find_matching_product(db, canon_name)
        if secondary_match:
            logger.info(f"Secondary match succeeded: '{raw_product}' -> '{canon_name}' -> '{secondary_match.name}'")
            # Update localized names if missing
            if not secondary_match.telugu_name and canon_info.get("telugu_name"):
                secondary_match.telugu_name = canon_info["telugu_name"]
            if not secondary_match.hindi_name and canon_info.get("hindi_name"):
                secondary_match.hindi_name = canon_info["hindi_name"]
            
            qty_val = float(quantity)
            if intent == "ADD_STOCK":
                secondary_match.current_stock += qty_val
                tx_type = "ADD"
                msg = f"✅ Stock updated: {secondary_match.name} (+{qty_val} {unit or secondary_match.unit}). Total: {secondary_match.current_stock} {secondary_match.unit}."
            elif intent == "REMOVE_STOCK":
                secondary_match.current_stock = max(0.0, secondary_match.current_stock - qty_val)
                tx_type = "REMOVE"
                msg = f"🔻 Stock reduced: {secondary_match.name} (-{qty_val} {unit or secondary_match.unit}). Remaining: {secondary_match.current_stock} {secondary_match.unit}."
            else:
                return "error", None, f"Unknown intent: {intent}"

            tx = InventoryTransaction(
                product_id=secondary_match.id,
                type=tx_type,
                source=source,
                quantity=qty_val,
                unit=unit or secondary_match.unit,
                voice_transcript=voice_transcript,
                notes=f"Processed from {source.lower()} command via canonical resolution."
            )
            db.add(tx)
            db.commit()
            db.refresh(secondary_match)
            return "stock_updated", secondary_match, msg

    if intent == "REMOVE_STOCK":
        return "error", None, f"⚠️ Cannot remove stock: Product '{raw_product}' is not found in inventory."

    # 3. Truly new product -> Auto-create new product!
    title_name = canon_name
    slug = re.sub(r"[^a-z0-9]+", "-", title_name.lower()).strip("-")
    if not slug:
        import uuid
        slug = f"item-{uuid.uuid4().hex[:6]}"
    
    telugu_display_name = canon_info.get("telugu_name") or (raw_product.strip() if any('\u0c00' <= c <= '\u0c7f' for c in raw_product) else None)
    hindi_display_name = canon_info.get("hindi_name") or (raw_product.strip() if any('\u0900' <= c <= '\u097f' for c in raw_product) else None)

    # Fetch authentic product image from internet using search query
    from app.image_service import get_or_fetch_product_image
    search_q = canon_info.get("search_query") or f"{title_name} grocery product packshot"
    image_url = get_or_fetch_product_image(product_name=title_name, slug=slug, camera_b64=image_b64, search_term=search_q)

    # Auto-infer sane unit and category
    safe_unit = unit or canon_info.get("unit") or "packets"
    safe_category = canon_info.get("category") or "General Grocery"
    new_product = Product(
        name=title_name,
        slug=slug,
        category=safe_category,
        current_stock=float(quantity),
        unit=safe_unit,
        min_stock=5.0,
        avg_daily_sales=1.0,
        cost_price=30.0,
        selling_price=40.0,
        image_url=image_url,
        telugu_name=telugu_display_name,
        hindi_name=hindi_display_name
    )
    db.add(new_product)
    db.commit()
    db.refresh(new_product)

    # Log NEW_PRODUCT_CREATED transaction
    tx = InventoryTransaction(
        product_id=new_product.id,
        type="NEW_PRODUCT_CREATED",
        source=source,
        quantity=float(quantity),
        unit=safe_unit,
        voice_transcript=voice_transcript,
        image_path=image_url if image_b64 else None,
        notes=f"Auto-created new product from {source.lower()} command."
    )
    db.add(tx)
    db.commit()

    msg = f"✨ Added new product to inventory: {new_product.name} ({quantity} {safe_unit})!"
    return "new_product_created", new_product, msg
