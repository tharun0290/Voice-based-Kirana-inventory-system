import logging
import os
import shutil
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

logger = logging.getLogger(__name__)

def _prepare_sqlite_url(url: str) -> str:
    """Prepare a writable SQLite database for Vercel demo deployments."""
    if not os.getenv("VERCEL") or not url.startswith("sqlite"):
        return url

    target = Path("/tmp/kirana_inventory.db")

    # Seed the writable /tmp database from the committed demo database once.
    source = Path(__file__).resolve().parents[1] / "kirana_inventory.db"
    if not target.exists() and source.exists():
        try:
            shutil.copy2(source, target)
        except Exception as exc:
            logger.warning("Could not copy bundled SQLite database: %s", exc)

    return f"sqlite:///{target}"

database_url = _prepare_sqlite_url(settings.DATABASE_URL)

try:
    engine = create_engine(
        database_url,
        pool_pre_ping=True,
        connect_args={"check_same_thread": False} if "sqlite" in database_url else {}
    )
    with engine.connect() as conn:
        logger.info("Connected successfully to database.")
except Exception as exc:
    logger.warning("Primary database connection failed: %s", exc)
    fallback = "sqlite:////tmp/kirana_inventory.db" if os.getenv("VERCEL") else "sqlite:///./kirana_inventory.db"
    engine = create_engine(
        fallback,
        connect_args={"check_same_thread": False} if "sqlite" in fallback else {}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
