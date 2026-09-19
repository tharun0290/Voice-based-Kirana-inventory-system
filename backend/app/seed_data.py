from sqlalchemy.orm import Session
from app.models import Product

SEED_PRODUCTS = [
    {
        "name": "Sona Masoori Rice (25kg)",
        "slug": "rice",
        "telugu_name": "సోనా మసూరి బియ్యం",
        "hindi_name": "सोना मसूरी चावल",
        "category": "Grains & Staples",
        "current_stock": 6.0,
        "unit": "bags",
        "min_stock": 10.0,
        "avg_daily_sales": 2.0,  # 3.0 days remaining (critical)
        "cost_price": 1350.0,
        "selling_price": 1550.0,
        "image_url": "/assets/products/rice.png"
    },
    {
        "name": "Toor Dal (Lentils)",
        "slug": "dal",
        "telugu_name": "కందిపప్పు",
        "hindi_name": "अरहर / तूर दाल",
        "category": "Pulses & Dals",
        "current_stock": 8.0,
        "unit": "kg",
        "min_stock": 15.0,
        "avg_daily_sales": 3.5,  # 2.3 days remaining (critical)
        "cost_price": 145.0,
        "selling_price": 170.0,
        "image_url": "/assets/products/dal.png"
    },
    {
        "name": "Sunflower Cooking Oil (1L)",
        "slug": "cooking-oil",
        "telugu_name": "సన్‌ఫ్లవర్ వంట నూనె",
        "hindi_name": "सूरजमुखी कुकिंग तेल",
        "category": "Oils & Ghee",
        "current_stock": 14.0,
        "unit": "bottles",
        "min_stock": 20.0,
        "avg_daily_sales": 4.5,  # 3.1 days remaining
        "cost_price": 115.0,
        "selling_price": 135.0,
        "image_url": "/assets/products/cooking_oil.png"
    },
    {
        "name": "Refined Sugar",
        "slug": "sugar",
        "telugu_name": "చక్కెర",
        "hindi_name": "सफेद चीनी",
        "category": "Grains & Staples",
        "current_stock": 25.0,
        "unit": "kg",
        "min_stock": 30.0,
        "avg_daily_sales": 6.0,  # 4.1 days remaining
        "cost_price": 38.0,
        "selling_price": 45.0,
        "image_url": "/assets/products/sugar.png"
    },
    {
        "name": "Tea Biscuits Pack",
        "slug": "biscuits",
        "telugu_name": "టీ బిస్కెట్లు",
        "hindi_name": "चाय बिस्कुट",
        "category": "Snacks & Packaged",
        "current_stock": 45.0,
        "unit": "packets",
        "min_stock": 30.0,
        "avg_daily_sales": 10.0,  # 4.5 days remaining
        "cost_price": 8.0,
        "selling_price": 10.0,
        "image_url": "/assets/products/biscuits.png"
    },
    {
        "name": "Bathing Soap Bar",
        "slug": "soap",
        "telugu_name": "స్నానం సబ్బు",
        "hindi_name": "नहाने का साबुन",
        "category": "Personal Care",
        "current_stock": 28.0,
        "unit": "bars",
        "min_stock": 20.0,
        "avg_daily_sales": 4.0,  # 7.0 days remaining
        "cost_price": 28.0,
        "selling_price": 35.0,
        "image_url": "/assets/products/soap.png"
    },
    {
        "name": "Tata Iodized Salt (1kg)",
        "slug": "salt",
        "telugu_name": "టాటా ఉప్పు",
        "hindi_name": "टाटा आयोडाइज्ड नमक",
        "category": "Grains & Staples",
        "current_stock": 40.0,
        "unit": "packets",
        "min_stock": 25.0,
        "avg_daily_sales": 4.0,  # 10.0 days remaining (healthy)
        "cost_price": 22.0,
        "selling_price": 28.0,
        "image_url": "/assets/products/salt.png"
    },
    {
        "name": "Premium Tea Powder (500g)",
        "slug": "tea-powder",
        "telugu_name": "టీ పొడి",
        "hindi_name": "प्रीमियम चाय पत्ती",
        "category": "Beverages",
        "current_stock": 12.0,
        "unit": "packets",
        "min_stock": 15.0,
        "avg_daily_sales": 3.0,  # 4.0 days remaining
        "cost_price": 125.0,
        "selling_price": 150.0,
        "image_url": "/assets/products/tea_powder.png"
    },
    {
        "name": "Whole Wheat Atta (5kg)",
        "slug": "atta",
        "telugu_name": "ఆశీర్వాద్ గోధుమ పిండి",
        "hindi_name": "आशीर्वाद गेहूं आटा",
        "category": "Grains & Staples",
        "current_stock": 5.0,
        "unit": "packets",
        "min_stock": 12.0,
        "avg_daily_sales": 2.5,  # 2.0 days remaining (urgent!)
        "cost_price": 235.0,
        "selling_price": 275.0,
        "image_url": "/assets/products/atta.png"
    },
    {
        "name": "Detergent Washing Powder (1kg)",
        "slug": "detergent-powder",
        "telugu_name": "సర్ఫ్ సబ్బు పొడి",
        "hindi_name": "सर्फ डिटर्जेंट पाउडर",
        "category": "Household & Cleaning",
        "current_stock": 18.0,
        "unit": "packets",
        "min_stock": 15.0,
        "avg_daily_sales": 3.0,  # 6.0 days remaining
        "cost_price": 115.0,
        "selling_price": 135.0,
        "image_url": "/assets/products/detergent_powder.png"
    }
]

def seed_initial_products(db: Session):
    """Seed products table if empty."""
    count = db.query(Product).count()
    if count == 0:
        for pdata in SEED_PRODUCTS:
            prod = Product(**pdata)
            db.add(prod)
        db.commit()
        print(f"Seeded {len(SEED_PRODUCTS)} initial kirana grocery items.")
