"""
Vercel entrypoint for the Kirana Mitra FastAPI backend.

Vercel discovers this file as the /api/* Python function. The existing
application remains in backend/app so local development is unchanged.
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND = os.path.join(ROOT, "backend")

if BACKEND not in sys.path:
    sys.path.insert(0, BACKEND)

from app.main import app
