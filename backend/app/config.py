import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "Kirana Mitra AI — Voice & Vision Inventory"
    API_V1_STR: str = "/api"
    
    # Model Selection: "gemini-3.8-live", "gemini-3.5-live-translate", "diffusiongemma-26b"
    ACTIVE_MODEL: str = os.getenv("ACTIVE_MODEL", "gemini-3.8-live")
    
    # Gemini Live / Google AI Configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "") or os.getenv("GOOGLE_API_KEY", "")
    
    # NVIDIA Integrate API Configuration
    NVIDIA_API_KEY: str = os.getenv("NVIDIA_API_KEY", "")
    NVIDIA_BASE_URL: str = "https://integrate.api.nvidia.com/v1"
    DIFFUSIONGEMMA_MODEL: str = "google/diffusiongemma-26b-a4b-it"
    ENABLE_THINKING: bool = False
    
    # Database Configuration (MySQL default with automatic fallback to SQLite)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./kirana_inventory.db")
    
    # Clarification Session TTL in seconds (2 minutes per prompt requirement)
    CLARIFICATION_TTL_SECONDS: int = 120
    
    # Assets directory
    UPLOAD_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public", "assets", "uploads"))
    PRODUCTS_ASSETS_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public", "assets", "products"))

    class Config:
        case_sensitive = True

settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.PRODUCTS_ASSETS_DIR, exist_ok=True)
