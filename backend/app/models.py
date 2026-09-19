from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    category = Column(String(100), default="General Grocery")
    current_stock = Column(Float, default=0.0, nullable=False)
    unit = Column(String(50), default="units", nullable=False)
    min_stock = Column(Float, default=5.0)
    avg_daily_sales = Column(Float, default=1.0)
    cost_price = Column(Float, default=0.0)
    selling_price = Column(Float, default=0.0)
    image_url = Column(String(500), default="/assets/products/unknown.png")
    telugu_name = Column(String(255), nullable=True)
    hindi_name = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    transactions = relationship("InventoryTransaction", back_populates="product", cascade="all, delete-orphan")

    @property
    def days_of_stock_remaining(self) -> float:
        if self.avg_daily_sales and self.avg_daily_sales > 0:
            return round(self.current_stock / self.avg_daily_sales, 1)
        return 999.0


class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    type = Column(String(50), nullable=False)  # ADD, REMOVE, AUDIT, NEW_PRODUCT_CREATED
    source = Column(String(50), default="MANUAL")  # VOICE, CAMERA, MANUAL
    quantity = Column(Float, default=0.0)
    unit = Column(String(50), default="units")
    voice_transcript = Column(Text, nullable=True)
    image_path = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="transactions")
