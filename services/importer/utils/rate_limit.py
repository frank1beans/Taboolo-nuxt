from __future__ import annotations

import time
from threading import Lock
from fastapi import HTTPException, status


class SlidingWindowRateLimiter:
    """Rate limiting in-memory con finestra mobile (thread-safe)."""

    def __init__(self, max_requests: int, window_seconds: int) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: dict[str, list[float]] = {}
        self._lock = Lock()

    def hit(self, key: str) -> None:
        now = time.time()
        with self._lock:
            hits = self._hits.setdefault(key, [])
            hits[:] = [ts for ts in hits if now - ts <= self.window_seconds]
            if len(hits) >= self.max_requests:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Troppe richieste, riprova più tardi",
                )
            hits.append(now)


def enforce_rate_limit(limiter: SlidingWindowRateLimiter, key: str) -> None:
    limiter.hit(key)
