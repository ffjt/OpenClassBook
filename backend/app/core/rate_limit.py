"""Small in-process limiter for sensitive endpoints.

Deployments with multiple API workers must also enforce equivalent limits at
the reverse proxy or gateway, where counters are shared between workers.
"""

import logging
from collections import defaultdict, deque
from threading import Lock
from time import monotonic

from fastapi import HTTPException, Request, status

logger = logging.getLogger(__name__)


class SlidingWindowRateLimiter:
    def __init__(self) -> None:
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def check(self, key: str, *, maximum: int, window_seconds: int) -> int | None:
        now = monotonic()
        cutoff = now - window_seconds
        with self._lock:
            events = self._events[key]
            while events and events[0] <= cutoff:
                events.popleft()
            if len(events) >= maximum:
                return max(1, int(events[0] + window_seconds - now))
            events.append(now)
        return None

    def reset(self) -> None:
        with self._lock:
            self._events.clear()


rate_limiter = SlidingWindowRateLimiter()


def enforce_rate_limit(
    request: Request,
    bucket: str,
    *,
    maximum: int,
    window_seconds: int,
) -> None:
    client = request.client.host if request.client else "unknown"
    retry_after = rate_limiter.check(
        f"{bucket}:{client}",
        maximum=maximum,
        window_seconds=window_seconds,
    )
    if retry_after is not None:
        logger.warning("security_event=rate_limited bucket=%s", bucket)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": "rate_limited",
                "message": "Too many requests. Please try again later.",
                "message_zh": "请求过于频繁，请稍后再试。",
            },
            headers={"Retry-After": str(retry_after)},
        )
