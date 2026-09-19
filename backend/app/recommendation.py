import math
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models import Product
from app.diffusion_gemma import call_diffusiongemma
import json
import logging

logger = logging.getLogger(__name__)

SYSTEM_NARRATION_PROMPT = """You are an AI assistant for an Indian kirana (grocery) shopkeeper.
You will be given a computed JSON recommendation showing which grocery products to buy based on remaining budget and depleted stock.
Your task is to phrase a SHORT, NATURAL, SHOPKEEPER-FRIENDLY summary (Telugu/English mix or conversational Telugu is great).
CRITICAL RULES:
1. You MUST ONLY narrate the numbers, quantities, products, and prices provided in the JSON input.
2. DO NOT invent quantities, prices, or add your own recommended items.
3. Keep it brief (2-3 sentences max) so it can be spoken out loud clearly.
"""

def compute_greedy_recommendations(db: Session, budget: float, target_days: float = 14.0) -> Dict[str, Any]:
    """
    Computes greedy inventory purchase allocation based on:
    days_of_stock_remaining = current_stock / avg_daily_sales
    ranked ascending (most critical / lowest days remaining first).
    Greedily allocates budget starting from lowest days-remaining.
    """
    products: List[Product] = db.query(Product).all()
    if not products:
        return {
            "budget": budget,
            "total_spent": 0.0,
            "remaining_budget": budget,
            "recommendations": []
        }

    # Calculate days of stock remaining and filter/sort
    product_metrics = []
    for p in products:
        daily_sales = p.avg_daily_sales if (p.avg_daily_sales and p.avg_daily_sales > 0) else 1.0
        days_remaining = p.current_stock / daily_sales
        product_metrics.append({
            "product": p,
            "days_remaining": days_remaining,
            "daily_sales": daily_sales,
            "cost_price": p.cost_price if (p.cost_price and p.cost_price > 0) else 50.0
        })

    # Sort ascending: lowest days remaining first
    product_metrics.sort(key=lambda x: x["days_remaining"])

    remaining_budget = budget
    total_spent = 0.0
    recommendations = []

    for item in product_metrics:
        p: Product = item["product"]
        daily_sales = item["daily_sales"]
        cost = item["cost_price"]
        current_days = item["days_remaining"]

        # If current stock covers more than target days, skip unless critical
        if current_days >= target_days:
            continue

        needed_units = math.ceil((target_days * daily_sales) - p.current_stock)
        if needed_units <= 0:
            continue

        needed_cost = needed_units * cost

        if needed_cost <= remaining_budget:
            allocated_units = needed_units
            spent_on_item = needed_cost
        else:
            # Partial allocation if budget permits at least 1 unit
            allocated_units = math.floor(remaining_budget / cost)
            spent_on_item = allocated_units * cost

        if allocated_units > 0:
            remaining_budget -= spent_on_item
            total_spent += spent_on_item
            recommendations.append({
                "product_id": p.id,
                "product_name": p.name,
                "telugu_name": p.telugu_name,
                "hindi_name": p.hindi_name,
                "slug": p.slug,
                "current_stock": p.current_stock,
                "unit": p.unit,
                "avg_daily_sales": round(daily_sales, 1),
                "days_of_stock_remaining": round(current_days, 1),
                "recommended_quantity": allocated_units,
                "unit_cost": cost,
                "total_cost": round(spent_on_item, 2),
                "image_url": p.image_url
            })

        if remaining_budget <= 0:
            break

    return {
        "budget": round(budget, 2),
        "total_spent": round(total_spent, 2),
        "remaining_budget": round(remaining_budget, 2),
        "recommendations": recommendations
    }

def get_narration_prompt_for_lang(lang: str = "te") -> str:
    if lang == "en":
        return """You are an AI assistant for an Indian Kirana (grocery) shopkeeper.
You will be given computed JSON recommendation data showing which grocery products to buy based on remaining budget and depleted stock.
Your task is to phrase a SHORT, NATURAL, SHOPKEEPER-FRIENDLY summary strictly in ENGLISH.
CRITICAL RULES:
1. You MUST write strictly in clear, professional English. Do NOT output Telugu or Hindi script.
2. ONLY narrate the numbers, quantities, products, and prices provided in the JSON input.
3. DO NOT invent quantities, prices, or add your own recommended items.
4. Keep it brief (2-3 sentences max).
5. Output ONLY the narration text.
"""
    elif lang == "hi":
        return """You are an AI assistant for an Indian Kirana (grocery) shopkeeper.
You will be given computed JSON recommendation data showing which grocery products to buy based on remaining budget and depleted stock.
Your task is to phrase a SHORT, NATURAL, SHOPKEEPER-FRIENDLY summary strictly in HINDI (हिन्दी देवनागरी लिपि).
CRITICAL RULES:
1. You MUST write strictly in natural Hindi (हिन्दी). Do NOT output Telugu or English text.
2. ONLY narrate the numbers, quantities, products, and prices provided in the JSON input.
3. DO NOT invent quantities, prices, or add your own recommended items.
4. Keep it brief (2-3 sentences max).
5. Output ONLY the narration text.
"""
    else:  # Telugu default
        return """You are an AI assistant for an Indian Kirana (grocery) shopkeeper.
You will be given computed JSON recommendation data showing which grocery products to buy based on remaining budget and depleted stock.
Your task is to phrase a SHORT, NATURAL, SHOPKEEPER-FRIENDLY summary strictly in TELUGU (తెలుగు లిపి).
CRITICAL RULES:
1. You MUST write strictly in natural, conversational Telugu (తెలుగు). Do NOT output Hindi or pure English text.
2. ONLY narrate the numbers, quantities, products, and prices provided in the JSON input.
3. DO NOT invent quantities, prices, or add your own recommended items.
4. Keep it brief (2-3 sentences max).
5. Output ONLY the narration text.
"""

async def narrate_recommendations(rec_data: Dict[str, Any], lang: str = "te") -> str:
    """Send structured JSON to Collaborative Engine (Gemini / DiffusionGemma) to generate shopkeeper narration in selected language."""
    user_json = json.dumps(rec_data)
    prompt = get_narration_prompt_for_lang(lang)
    narration_text, _ = await call_diffusiongemma(
        system_prompt=prompt,
        user_content=user_json,
        is_json_expected=False
    )
    if narration_text:
        return narration_text
        
    if lang == "en":
        return "Purchase recommendation calculated successfully."
    elif lang == "hi":
        return "पुनर्खरीद बजट आवंटन सफलतापूर्वक पूरा हुआ।"
    return "సిఫార్సు ప్రకారం అత్యవసర స్టాక్ ఆర్డర్ సిద్ధం చేయబడింది."
