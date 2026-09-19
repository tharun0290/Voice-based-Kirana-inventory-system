import time
import uuid
import threading
from typing import Optional, Dict, Any
from app.config import settings

class ClarificationSessionStore:
    def __init__(self, ttl_seconds: int = 120):
        self._ttl = ttl_seconds
        self._store: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()

    def _cleanup_expired(self):
        now = time.time()
        expired = [sid for sid, data in self._store.items() if now - data.get("created_at", 0) > self._ttl]
        for sid in expired:
            self._store.pop(sid, None)

    def create_session(
        self,
        product: str,
        unit: Optional[str],
        intent: str,
        source: str,
        image_data: Optional[str] = None
    ) -> str:
        with self._lock:
            self._cleanup_expired()
            session_id = str(uuid.uuid4())
            self._store[session_id] = {
                "session_id": session_id,
                "product": product,
                "unit": unit,
                "intent": intent,
                "source": source,
                "image_data": image_data,
                "created_at": time.time(),
                "retry_count": 0
            }
            return session_id

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            self._cleanup_expired()
            session = self._store.get(session_id)
            if not session:
                return None
            return session

    def increment_retry(self, session_id: str) -> int:
        with self._lock:
            if session_id in self._store:
                self._store[session_id]["retry_count"] += 1
                return self._store[session_id]["retry_count"]
            return 0

    def remove_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return self._store.pop(session_id, None)

session_store = ClarificationSessionStore(ttl_seconds=settings.CLARIFICATION_TTL_SECONDS)
