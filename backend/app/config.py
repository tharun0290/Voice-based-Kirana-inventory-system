import os
from pathlib import Path
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parents[2]
IS_VERCEL = bool(os.getenv("VERCEL"))

class Settings(BaseSettings):
    PROJECT_NAME: str = "Kirana Mitra AI — Voice & Vision Inventory"
    API_V1_STR: str = "/api"

    ACTIVE_MODEL: str = os.getenv("ACTIVE_MODEL", "gemini-3.8-live")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "") or os.getenv("GOOGLE_API_KEY", "")
    NVIDIA_API_KEY: str = os.getenv("NVIDIA_API_KEY", "")
    NVIDIA_BASE_URL: str = "https://integrate.api.nvidia.com/v1"
    DIFFUSIONGEMMA_MODEL: str = "google/diffusiongemma-26b-a4b-it"
    ENABLE_THINKING: bool = False

    # Vercel's deployment filesystem is not a persistent writable database.
    # Use an external DATABASE_URL in production. For a demo without one,
    # use /tmp so the function can initialize and serve the app.
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:////tmp/kirana_inventory.db" if IS_VERCEL else "sqlite:///./kirana_inventory.db"
    )

    CLARIFICATION_TTL_SECONDS: int = 120

    PRODUCTS_ASSETS_DIR: str = str(
        BASE_DIR / "frontend" / "public" / "assets" / "products"
    )
    UPLOAD_DIR: str = (
        "/tmp/kirana_uploads"
        if IS_VERCEL
        else str(BASE_DIR / "frontend" / "public" / "assets" / "uploads")
    )

    class Config:
        case_sensitive = True

settings = Settings()

# Only create writable runtime directories. Product assets are committed static files.
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
