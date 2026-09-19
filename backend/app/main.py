import os
import io
import logging
from typing import Optional, List, Tuple
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from gtts import gTTS

from app.config import settings
from app.database import engine, Base, get_db
from app.models import Product, InventoryTransaction
from app.schemas import (
    VoiceCommandRequest,
    CameraCommandRequest,
    ClarifyRequest,
    ProductResponse,
    ProductStockAdjustRequest,
    ProductImageUpdateRequest,
    PurchaseRecommendationResponse,
    TransactionResponse
)
from app.session_store import session_store
from app.diffusion_gemma import call_diffusiongemma, simulate_diffusiongemma
from app.product_service import resolve_and_apply_stock, find_matching_product
from app.recommendation import compute_greedy_recommendations, narrate_recommendations
from app.seed_data import seed_initial_products

# Initialize tables and seed data
Base.metadata.create_all(bind=engine)
with engine.connect() as conn:
    pass

# Seed if empty
db_init = next(get_db())
try:
    seed_initial_products(db_init)
finally:
    db_init.close()

logger = logging.getLogger("kirana_app")
logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Voice and Camera Driven Kirana Inventory System with NVIDIA DiffusionGemma 26B A4B IT",
    version="1.0.0"
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static asset directories
app.mount("/assets/products", StaticFiles(directory=settings.PRODUCTS_ASSETS_DIR), name="products")
app.mount("/assets/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

VOICE_INTENT_SYSTEM_PROMPT = """You are the reasoning brain for an Indian Kirana (grocery) inventory management system.
Your job is to analyze the shopkeeper's transcribed speech (which may be English, Telugu, Hindi, or mixed Telugu-English/Hinglish) and extract the inventory intent.
Return ONLY strict JSON matching one of these schemas, and nothing else:

For adding stock:
{ "intent": "ADD_STOCK", "product": string, "quantity": number|null, "unit": string|null }

For removing stock:
{ "intent": "REMOVE_STOCK", "product": string, "quantity": number|null, "unit": string|null }

For purchase recommendations or budget queries (e.g. 'Naa daggara 5000 rupees undi em konali', 'budget 5000', 'what should I buy', 'मेरे पास 5000 रुपये हैं क्या खरीदें'):
{ "intent": "PURCHASE_RECOMMENDATION", "budget": number }

If the speech is ambiguous, irrelevant, or does not clearly state a grocery intent:
{ "intent": "UNKNOWN", "reason": string }

CRITICAL RULES:
1. ONLY extract what is stated in the speech.
2. If quantity or unit is not mentioned, return quantity: null and unit: null. DO NOT GUESS or invent numbers.
3. Common Kirana words:
   - Telugu: 'biyyam' (rice), 'pappu' (dal), 'nune' (oil), 'chekkera'/'panchadara' (sugar), 'uppu' (salt), 'basta'/'bostalu' (bags), 'kilo'/'kg' (kg), 'add cheyyi' / 'veyyi' / 'వేయి' (add), 'theesi veyyi' / 'తీసివేయి' (remove), 'em konali' (what to buy).
   - In Telugu inventory commands, 'వేయి' (veyyi) or 'చెయ్యి' at the end is the verb 'ADD / PUT', NOT the number 1,000! For example, 'కోకోకోలా జీరో 5 వేయి' means quantity=5 (add 5 cans), NOT 5000!
   - Hindi: 'चावल' (rice), 'दाल' (dal), 'तेल' (oil), 'चीनी' (sugar), 'नमक' (salt), 'बोरी' (bags), 'किलो' (kg), 'जोड़ो' / 'डालो' (add), 'निकालो' (remove), 'क्या खरीदें' (what to buy).
4. Canonicalize brand/item name to standard product title (e.g. 'Coca-Cola Zero', 'Sona Masoori Rice', 'Horlicks').
5. Output MUST be pure valid JSON with no markdown backticks, no explanations.
"""

CAMERA_SYSTEM_PROMPT = """You are the multimodal vision brain for an Indian Kirana (grocery) inventory management system.
You are given a camera frame captured by the shopkeeper, along with an optional transcribed speech utterance.
Your task:
1. Identify the single most likely product visible in the image (a common Indian grocery item — packaged food, bottle, bag, box, grain sack, etc.).
2. Combine that product with anything the accompanying speech said (e.g. quantity, unit, intent).
3. If no speech or speech says 'add this', default intent is ADD_STOCK.
4. If quantity was not spoken, return quantity: null and unit: null. DO NOT INVENT a quantity if none was spoken.
5. Return ONLY strict JSON in this format:
{ "intent": "ADD_STOCK", "product": string, "product_confidence": "high"|"low", "quantity": number|null, "unit": string|null }
6. If the image does not clearly show a recognizable grocery product, return:
{ "intent": "UNKNOWN", "reason": "no_product_detected" }
Do not output any markdown ticks or explanations. ONLY valid JSON.
"""

CLARIFY_SYSTEM_PROMPT = """You are an assistant extracting inventory quantities from a shopkeeper's short answer.
Extract JUST the numeric quantity and unit from the user's reply (e.g. '20 packets', '5 kg', '10', 'రెండు బస్తాలు').
Return ONLY strict JSON matching:
{ "quantity": number|null, "unit": string|null }
Do not include any explanation or markdown formatting.
"""

TELUGU_PRODUCT_DISPLAY = {
    "rice": "బియ్యం",
    "sona masoori rice": "బియ్యం",
    "sona masoori rice (25kg)": "బియ్యం",
    "dal": "కందిపప్పు",
    "dal / lentils": "కందిపప్పు",
    "toor dal": "కందిపప్పు",
    "toor dal (lentils)": "కందిపప్పు",
    "cooking oil": "వంట నూనె",
    "oil": "వంట నూనె",
    "sunflower cooking oil (1l)": "వంట నూనె",
    "sugar": "చక్కెర",
    "refined sugar": "చక్కెర",
    "biscuits": "బిస్కెట్లు",
    "tea biscuits pack": "బిస్కెట్లు",
    "soap": "స్నానం సబ్బు",
    "bathing soap bar": "స్నానం సబ్బు",
    "salt": "ఉప్పు",
    "tata iodized salt (1kg)": "ఉప్పు",
    "tea powder": "టీ పొడి",
    "premium tea powder (500g)": "టీ పొడి",
    "atta": "గోధుమ పిండి",
    "whole wheat atta (5kg)": "గోధుమ పిండి",
    "detergent powder": "సబ్బు పొడి",
    "detergent washing powder (1kg)": "సబ్బు పొడి",
    "maggi noodles": "మ్యాగీ నూడుల్స్",
    "coca-cola zero sugar can": "కోకోకోలా జీరో",
    "bourbon biscuits": "బోర్బన్ బిస్కెట్లు",
}

TELUGU_UNIT_DISPLAY = {
    "bags": "బస్తాలు",
    "bag": "బస్తా",
    "kg": "కేజీలు",
    "kilo": "కిలోలు",
    "bottles": "బాటిళ్లు",
    "bottle": "బాటిల్",
    "bars": "సబ్బులు",
    "bar": "సబ్బు",
    "packets": "ప్యాకెట్లు",
    "packet": "ప్యాకెట్",
    "cans": "క్యాన్లు",
    "can": "క్యాన్"
}

HINDI_PRODUCT_DISPLAY = {
    "rice": "चावल",
    "sona masoori rice": "चावल",
    "sona masoori rice (25kg)": "चावल",
    "dal": "दाल",
    "dal / lentils": "दाल",
    "toor dal": "तूर दाल",
    "toor dal (lentils)": "तूर दाल",
    "cooking oil": "कुकिंग तेल",
    "oil": "तेल",
    "sunflower cooking oil (1l)": "सूरजमुखी तेल",
    "sugar": "चीनी",
    "refined sugar": "चीनी",
    "biscuits": "बिस्कुट",
    "tea biscuits pack": "बिस्कुट",
    "soap": "साबुन",
    "bathing soap bar": "साबुन",
    "salt": "नमक",
    "tata iodized salt (1kg)": "टाटा नमक",
    "tea powder": "चाय पत्ती",
    "premium tea powder (500g)": "चाय पत्ती",
    "atta": "गेहूं आटा",
    "whole wheat atta (5kg)": "आटा",
    "detergent powder": "डिटर्जेंट पाउडर",
    "detergent washing powder (1kg)": "डिटर्जेंट पाउडर",
    "maggi noodles": "मैगी नूडल्स",
    "coca-cola zero sugar can": "कोका-कोला ज़ीरो",
    "bourbon biscuits": "बोर्बन बिस्कुट",
}

HINDI_UNIT_DISPLAY = {
    "bags": "बोरी",
    "bag": "बोरी",
    "kg": "किलो",
    "kilo": "किलो",
    "bottles": "बोतल",
    "bottle": "बोतल",
    "bars": "टुकड़े",
    "bar": "टुकड़ा",
    "packets": "पैकेट",
    "packet": "पैकेट",
    "cans": "कैन",
    "can": "कैन"
}

def get_multilingual_clarification_question(product_raw: str, unit: Optional[str], intent: str = "ADD_STOCK", lang: str = "te") -> Tuple[str, str, str, str]:
    """Returns (primary_question, english_subtitle, localized_product, localized_unit)"""
    p_lower = product_raw.lower().strip()
    u_lower = (unit or "packets").lower().strip()

    if lang == "hi":
        hi_prod = HINDI_PRODUCT_DISPLAY.get(p_lower, product_raw)
        hi_unit = HINDI_UNIT_DISPLAY.get(u_lower, u_lower)
        verb = "जोड़ना है" if intent == "ADD_STOCK" else "निकालना है"
        primary_q = f"{hi_prod} पहचाना गया। कितने {hi_unit} {verb}?"
        loc_prod, loc_unit = hi_prod, hi_unit
    elif lang == "en":
        eng_verb = "add" if intent == "ADD_STOCK" else "remove"
        primary_q = f"Detected {product_raw}. How many {unit or 'packets'} should I {eng_verb}?"
        loc_prod, loc_unit = product_raw, unit or "packets"
    else:  # Telugu default
        tel_prod = TELUGU_PRODUCT_DISPLAY.get(p_lower, product_raw)
        tel_unit = TELUGU_UNIT_DISPLAY.get(u_lower, u_lower)
        verb = "వేయాలి" if intent == "ADD_STOCK" else "తొలగించాలి"
        primary_q = f"{tel_prod} గుర్తించబడింది. ఎన్ని {tel_unit} {verb}?"
        loc_prod, loc_unit = tel_prod, tel_unit

    eng_verb = "add" if intent == "ADD_STOCK" else "remove"
    eng_q = f"Detected {product_raw}. How many {unit or 'packets'} should I {eng_verb}?"
    return primary_q, eng_q, loc_prod, loc_unit

# Backward compatibility alias
get_telugu_clarification_question = get_multilingual_clarification_question

@app.get("/api/tts")
def text_to_speech(text: str, lang: str = "te"):
    """
    Generates authentic, natural Telugu speech using Google Live TTS.
    Returns audio/mpeg stream with authentic Telugu pronunciation and accent.
    """
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Text required")
    try:
        tts = gTTS(text=text.strip(), lang=lang, slow=False)
        buf = io.BytesIO()
        tts.write_to_fp(buf)
        buf.seek(0)
        return StreamingResponse(buf, media_type="audio/mpeg")
    except Exception as e:
        logger.error(f"TTS generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
def health_check():
    is_nvidia_valid = bool(settings.NVIDIA_API_KEY and settings.NVIDIA_API_KEY.strip() not in ["", "your_nvidia_api_key_here", "YOUR_NVIDIA_API_KEY"])
    is_gemini_valid = bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip() not in ["", "your_gemini_api_key_here"])
    
    return {
        "status": "healthy",
        "model": settings.DIFFUSIONGEMMA_MODEL,
        "engine": "Gemini Live + DiffusionGemma Collaborative AI",
        "gemini_role": "Vision Item Scanner, Multilingual Canonicalization & TTS",
        "diffusiongemma_role": "Kirana Inventory Reasoning, Stock Ledger & Reorder Logic",
        "thinking_enabled": settings.ENABLE_THINKING,
        "nvidia_configured": is_nvidia_valid,
        "gemini_configured": is_gemini_valid,
        "key_preview": "⚡ Gemini Live + DiffusionGemma Active"
    }

@app.post("/api/settings/model")
def set_active_model(payload: dict):
    model = payload.get("model", "gemini-3.8-live").strip()
    settings.ACTIVE_MODEL = model
    os.environ["ACTIVE_MODEL"] = model
    logger.info(f"Active reasoning model switched to: {model}")
    return {"status": "success", "active_model": settings.ACTIVE_MODEL}

@app.post("/api/settings/key")
def update_api_key(payload: dict):
    nvidia_key = payload.get("nvidia_api_key") or payload.get("api_key")
    gemini_key = payload.get("gemini_api_key")
    active_model = payload.get("active_model")
    
    if active_model:
        settings.ACTIVE_MODEL = active_model
        os.environ["ACTIVE_MODEL"] = active_model

    if nvidia_key:
        settings.NVIDIA_API_KEY = nvidia_key.strip()
        os.environ["NVIDIA_API_KEY"] = nvidia_key.strip()
        
    if gemini_key:
        settings.GEMINI_API_KEY = gemini_key.strip()
        os.environ["GEMINI_API_KEY"] = gemini_key.strip()
    
    # Persist to backend/.env
    env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
    try:
        with open(env_path, "w") as f:
            f.write(
                f"# Model & API Keys\n"
                f"ACTIVE_MODEL={settings.ACTIVE_MODEL}\n"
                f"GEMINI_API_KEY={settings.GEMINI_API_KEY}\n"
                f"NVIDIA_API_KEY={settings.NVIDIA_API_KEY}\n"
                f"DATABASE_URL={settings.DATABASE_URL}\n"
                f"ENABLE_THINKING={settings.ENABLE_THINKING}\n"
            )
    except Exception as e:
        logger.warning(f"Could not persist to .env: {e}")

    return {
        "status": "success",
        "message": f"Settings saved! Active model: {settings.ACTIVE_MODEL}",
        "active_model": settings.ACTIVE_MODEL
    }

@app.get("/api/inventory", response_model=List[ProductResponse])
def get_inventory(db: Session = Depends(get_db)):
    products = db.query(Product).order_by(Product.id.asc()).all()
    return products

@app.put("/api/products/{product_id}/image")
def update_product_image(product_id: int, payload: ProductImageUpdateRequest, db: Session = Depends(get_db)):
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")

    image_url = payload.image_url.strip()
    if not image_url:
        raise HTTPException(status_code=400, detail="Image URL is required")
    if not (image_url.startswith("/") or image_url.startswith("http://") or image_url.startswith("https://")):
        raise HTTPException(status_code=400, detail="Image URL must be a local path or absolute URL")

    prod.image_url = image_url
    db.commit()
    db.refresh(prod)
    return {
        "status": "success",
        "message": "Product image updated successfully.",
        "product_id": prod.id,
        "image_url": prod.image_url
    }

@app.delete("/api/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    prod = db.query(Product).filter(Product.id == product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")

    db.delete(prod)
    db.commit()
    return {
        "status": "success",
        "message": f"Product '{prod.name}' deleted successfully.",
        "deleted_product_id": product_id
    }

@app.post("/api/inventory/adjust")
def adjust_product_stock(payload: ProductStockAdjustRequest, db: Session = Depends(get_db)):
    prod = db.query(Product).filter(Product.id == payload.product_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found")
    
    prod.current_stock = max(0.0, prod.current_stock + payload.delta)
    tx = InventoryTransaction(
        product_id=prod.id,
        type="ADD" if payload.delta > 0 else "REMOVE",
        source="MANUAL",
        quantity=abs(payload.delta),
        unit=prod.unit,
        notes="Manual adjustment from dashboard"
    )
    db.add(tx)
    db.commit()
    db.refresh(prod)
    return {
        "status": "success",
        "product_id": prod.id,
        "current_stock": prod.current_stock,
        "days_of_stock_remaining": prod.days_of_stock_remaining
    }

@app.post("/api/voice-command")
async def handle_voice_command(payload: VoiceCommandRequest, db: Session = Depends(get_db)):
    transcript = payload.transcript.strip()
    if not transcript:
        raise HTTPException(status_code=400, detail="Transcript cannot be empty")

    logger.info(f"Voice Command received: '{transcript}'")
    raw_response, parsed_json = await call_diffusiongemma(
        system_prompt=VOICE_INTENT_SYSTEM_PROMPT,
        user_content=f"Shopkeeper utterance: \"{transcript}\"",
        enable_thinking=settings.ENABLE_THINKING,
        is_json_expected=True
    )

    if not parsed_json or "intent" not in parsed_json:
        return {
            "status": "error",
            "action": "unknown",
            "message": "Could not parse voice command. Please try speaking clearly.",
            "raw": raw_response
        }

    intent = parsed_json.get("intent")
    
    # 1. Purchase recommendation
    if intent == "PURCHASE_RECOMMENDATION":
        raw_budget = parsed_json.get("budget")
        user_lang = getattr(payload, "lang", "te") or "te"
        
        # If budget is not specified, ASK THE BUDGET FIRST before thinking!
        if not raw_budget or float(raw_budget) <= 0:
            if user_lang == "en":
                q_text = "What is your purchase budget? (e.g. 5,000 rupees)"
                sub_text = "Please enter or speak your budget to calculate stock reorder advice."
            elif user_lang == "hi":
                q_text = "आपका खरीद बजट कितना है? (उदा: 5,000 रुपये)"
                sub_text = "पुनर्खरीद सलाह प्राप्त करने के लिए कृपया बजट बताएं या चुनें।"
            else:
                q_text = "మీ కొనుగోలు బడ్జెట్ ఎంత? (ఉదా: 5,000 రూపాయలు)"
                sub_text = "సరుకుల రీఆర్డర్ సలహా కోసం దయచేసి మీ బడ్జెట్ చెప్పండి లేదా ఎంచుకోండి."

            return {
                "status": "needs_budget",
                "action": "ask_budget",
                "question": q_text,
                "subtitle": sub_text,
                "default_budget": 5000,
                "message": q_text
            }

        budget = float(raw_budget)
        rec_data = compute_greedy_recommendations(db, budget=budget)
        narration = await narrate_recommendations(rec_data, lang=user_lang)
        return {
            "status": "success",
            "action": "purchase_recommendation",
            "intent": intent,
            "budget": budget,
            "recommendation": rec_data,
            "narration": narration,
            "message": narration
        }

    # 2. Stock updates (ADD or REMOVE)
    if intent in ["ADD_STOCK", "REMOVE_STOCK"]:
        product_raw = parsed_json.get("product")
        quantity = parsed_json.get("quantity")
        unit = parsed_json.get("unit")
        user_lang = (getattr(payload, "lang", "en") or "en").lower()

        if not product_raw:
            return {
                "status": "error",
                "action": "unknown",
                "message": "Product name was not recognized in speech. Please repeat with product name."
            }

        # Step 3: Clarification Flow if quantity is missing
        if quantity is None:
            session_id = session_store.create_session(
                product=product_raw,
                unit=unit,
                intent=intent,
                source="voice"
            )
            prim_q, eng_q, loc_prod, loc_unit = get_multilingual_clarification_question(product_raw, unit, intent=intent, lang=user_lang)
            return {
                "status": "needs_clarification",
                "session_id": session_id,
                "question": prim_q,
                "english_question": eng_q,
                "intent": intent,
                "product": product_raw,
                "telugu_product": loc_prod,
                "unit": unit or "packets",
                "telugu_unit": loc_unit,
                "source": "voice"
            }

        # Quantity is known -> Step 4 Product Resolution
        action, product_obj, message = resolve_and_apply_stock(
            db=db,
            intent=intent,
            raw_product=product_raw,
            quantity=quantity,
            unit=unit,
            source="VOICE",
            voice_transcript=transcript
        )
        return {
            "status": "success" if action != "error" else "error",
            "action": action,
            "intent": intent,
            "product": product_obj.name if product_obj else product_raw,
            "product_id": product_obj.id if product_obj else None,
            "current_stock": product_obj.current_stock if product_obj else None,
            "message": message
        }

    # 3. Unknown intent
    return {
        "status": "error",
        "action": "unknown",
        "message": parsed_json.get("reason") or "Command not recognized. Try saying 'Rice 10 bags add cheyyi' or 'Em konali'."
    }

@app.post("/api/camera-command")
async def handle_camera_command(payload: CameraCommandRequest, db: Session = Depends(get_db)):
    if not payload.image_b64:
        raise HTTPException(status_code=400, detail="Image data is required")

    speech_context = f"Shopkeeper speech accompanying photo: \"{payload.voice_transcript}\"" if payload.voice_transcript else "No accompanying speech."
    
    logger.info("Camera Command received with frame snapshot.")
    raw_response, parsed_json = await call_diffusiongemma(
        system_prompt=CAMERA_SYSTEM_PROMPT,
        user_content=speech_context,
        image_b64=payload.image_b64,
        enable_thinking=settings.ENABLE_THINKING,
        is_json_expected=True
    )

    if not parsed_json or "intent" not in parsed_json:
        return {
            "status": "error",
            "action": "unknown",
            "message": "Could not identify grocery item from camera frame.",
            "raw": raw_response
        }

    intent = parsed_json.get("intent")
    if intent == "UNKNOWN":
        # Keep camera commands deterministic when a remote vision model cannot
        # identify a low-resolution frame or is temporarily unavailable.
        _, local_result = simulate_diffusiongemma(
            CAMERA_SYSTEM_PROMPT,
            speech_context,
            payload.image_b64,
            is_json_expected=True
        )
        if local_result and local_result.get("intent") != "UNKNOWN":
            parsed_json = local_result
            intent = parsed_json.get("intent")
        else:
            return {
                "status": "error",
                "action": "unknown",
                "message": "No recognizable grocery product detected. Please hold item steadily in front of camera."
            }

    product_raw = parsed_json.get("product") or "Grocery Item"
    quantity = parsed_json.get("quantity")
    unit = parsed_json.get("unit")
    user_lang = (getattr(payload, "lang", "en") or "en").lower()

    # Resolve against DB catalog for canonical name and unit
    matched = find_matching_product(db, product_raw)
    canonical_name = matched.name if matched else product_raw
    canonical_unit = unit or (matched.unit if matched else "packets")

    # Step 3: Clarification Flow if quantity is missing
    if quantity is None:
        session_id = session_store.create_session(
            product=canonical_name,
            unit=canonical_unit,
            intent=intent,
            source="camera",
            image_data=payload.image_b64
        )
        prim_q, eng_q, loc_prod, loc_unit = get_multilingual_clarification_question(canonical_name, canonical_unit, intent=intent, lang=user_lang)
        return {
            "status": "needs_clarification",
            "session_id": session_id,
            "question": prim_q,
            "english_question": eng_q,
            "intent": intent,
            "product": canonical_name,
            "telugu_product": loc_prod,
            "unit": canonical_unit,
            "telugu_unit": loc_unit,
            "source": "camera"
        }

    # Quantity is known -> Step 4 Product Resolution
    action, product_obj, message = resolve_and_apply_stock(
        db=db,
        intent=intent,
        raw_product=product_raw,
        quantity=quantity,
        unit=unit,
        source="CAMERA",
        image_b64=payload.image_b64,
        voice_transcript=payload.voice_transcript
    )
    return {
        "status": "success" if action != "error" else "error",
        "action": action,
        "intent": intent,
        "product": product_obj.name if product_obj else product_raw,
        "product_id": product_obj.id if product_obj else None,
        "current_stock": product_obj.current_stock if product_obj else None,
        "image_url": product_obj.image_url if product_obj else None,
        "message": message
    }

@app.post("/api/clarify")
async def handle_clarification(payload: ClarifyRequest, db: Session = Depends(get_db)):
    session = session_store.get_session(payload.session_id)
    if not session:
        return {
            "status": "error",
            "action": "expired",
            "message": "Clarification session expired. Please speak or scan the item again."
        }

    reply = payload.reply_text.strip()
    logger.info(f"Clarification reply for session {payload.session_id}: '{reply}'")
    
    # Extract quantity and unit via DiffusionGemma
    _, parsed_json = await call_diffusiongemma(
        system_prompt=CLARIFY_SYSTEM_PROMPT,
        user_content=f"Shopkeeper reply: \"{reply}\"",
        is_json_expected=True
    )

    quantity = parsed_json.get("quantity") if parsed_json else None
    unit = parsed_json.get("unit") if parsed_json else None

    if quantity is None:
        retries = session_store.increment_retry(payload.session_id)
        if retries > 1:
            session_store.remove_session(payload.session_id)
            return {
                "status": "error",
                "action": "unknown",
                "message": "Could not understand quantity. Session ended, please try again."
            }
        return {
            "status": "needs_clarification",
            "session_id": payload.session_id,
            "question": f"Sorry, please repeat just the count or quantity (e.g. '10 packets' or '5 kg'):",
            "intent": session["intent"],
            "product": session["product"],
            "source": session["source"]
        }

    # Complete clarification -> Merge with stored session and resolve
    session_data = session_store.remove_session(payload.session_id)
    final_unit = unit or session_data.get("unit") or "packets"
    
    action, product_obj, message = resolve_and_apply_stock(
        db=db,
        intent=session_data["intent"],
        raw_product=session_data["product"],
        quantity=quantity,
        unit=final_unit,
        source=session_data["source"].upper(),
        image_b64=session_data.get("image_data"),
        voice_transcript=f"Clarified: {reply}"
    )

    return {
        "status": "success" if action != "error" else "error",
        "action": action,
        "intent": session_data["intent"],
        "product": product_obj.name if product_obj else session_data["product"],
        "product_id": product_obj.id if product_obj else None,
        "current_stock": product_obj.current_stock if product_obj else None,
        "image_url": product_obj.image_url if product_obj else None,
        "message": message
    }

@app.post("/api/purchase-recommendation", response_model=PurchaseRecommendationResponse)
async def get_purchase_recommendation(payload: dict, db: Session = Depends(get_db)):
    budget = float(payload.get("budget", 5000.0))
    lang = payload.get("lang", "te")
    rec_data = compute_greedy_recommendations(db, budget=budget)
    narration = await narrate_recommendations(rec_data, lang=lang)
    
    return PurchaseRecommendationResponse(
        budget=rec_data["budget"],
        total_spent=rec_data["total_spent"],
        remaining_budget=rec_data["remaining_budget"],
        recommendations=rec_data["recommendations"],
        narration=narration
    )

@app.get("/api/transactions", response_model=List[TransactionResponse])
def get_transactions(limit: int = 20, db: Session = Depends(get_db)):
    txs = db.query(InventoryTransaction).order_by(InventoryTransaction.id.desc()).limit(limit).all()
    return txs

@app.post("/api/seed")
def reset_seed_data(db: Session = Depends(get_db)):
    db.query(InventoryTransaction).delete()
    db.query(Product).delete()
    db.commit()
    seed_initial_products(db)
    return {"status": "success", "message": "Database reset and seeded with initial 10 Kirana products."}
