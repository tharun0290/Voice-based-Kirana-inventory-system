from typing import Optional, List, Literal
from datetime import datetime
from pydantic import BaseModel, Field

class VoiceCommandRequest(BaseModel):
    transcript: str
    lang: Optional[str] = "en"

class CameraCommandRequest(BaseModel):
    image_b64: str  # Base64 encoded JPEG / PNG frame
    voice_transcript: Optional[str] = None
    lang: Optional[str] = "en"

class ClarifyRequest(BaseModel):
    session_id: str
    reply_text: str
    lang: Optional[str] = "en"

class ExtractedIntent(BaseModel):
    intent: Literal["ADD_STOCK", "REMOVE_STOCK", "PURCHASE_RECOMMENDATION", "UNKNOWN"]
    product: Optional[str] = None
    product_confidence: Optional[Literal["high", "low"]] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    budget: Optional[float] = None
    reason: Optional[str] = None

class ClarificationNeeded(BaseModel):
    status: Literal["needs_clarification"] = "needs_clarification"
    session_id: str
    question: str
    intent: str
    product: str
    source: str

class ProductBase(BaseModel):
    name: str
    slug: str
    category: str = "General Grocery"
    current_stock: float = 0.0
    unit: str = "units"
    min_stock: float = 5.0
    avg_daily_sales: float = 1.0
    cost_price: float = 0.0
    selling_price: float = 0.0
    image_url: str = "/assets/products/unknown.png"
    telugu_name: Optional[str] = None
    hindi_name: Optional[str] = None

class ProductResponse(ProductBase):
    id: int
    days_of_stock_remaining: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ProductStockAdjustRequest(BaseModel):
    product_id: int
    delta: float  # + or -

class ProductImageUpdateRequest(BaseModel):
    image_url: str

class RecommendationItem(BaseModel):
    product_id: int
    product_name: str
    telugu_name: Optional[str] = None
    hindi_name: Optional[str] = None
    slug: str
    current_stock: float
    unit: str
    avg_daily_sales: float
    days_of_stock_remaining: float
    recommended_quantity: float
    unit_cost: float
    total_cost: float
    image_url: str

class PurchaseRecommendationResponse(BaseModel):
    budget: float
    total_spent: float
    remaining_budget: float
    recommendations: List[RecommendationItem]
    narration: str

class TransactionResponse(BaseModel):
    id: int
    product_id: Optional[int]
    type: str
    source: str
    quantity: float
    unit: str
    voice_transcript: Optional[str]
    notes: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True
