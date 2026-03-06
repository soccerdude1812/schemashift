"""Token bucket rate limiter for burst protection.

DB-based scan_count is the primary gate. This in-memory limiter is a
secondary burst defense. It resets on process restart (accepted risk AR1).
"""

import time
import threading
from collections import defaultdict
from dataclasses import dataclass, field


@dataclass
class TokenBucket:
    """Token bucket for rate limiting."""
    capacity: int
    refill_rate: float  # tokens per second
    tokens: float = field(init=False)
    last_refill: float = field(init=False)

    def __post_init__(self):
        self.tokens = float(self.capacity)
        self.last_refill = time.monotonic()

    def consume(self, n: int = 1) -> bool:
        """Try to consume n tokens. Returns True if allowed."""
        now = time.monotonic()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now

        if self.tokens >= n:
            self.tokens -= n
            return True
        return False


class RateLimiter:
    """Per-key token bucket rate limiter (in-memory)."""

    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity
        self.refill_rate = refill_rate
        self._buckets: dict[str, TokenBucket] = {}
        self._lock = threading.Lock()
        self._cleanup_interval = 300  # seconds
        self._last_cleanup = time.monotonic()

    def allow(self, key: str, n: int = 1) -> bool:
        """Check if a request for `key` is allowed."""
        with self._lock:
            self._maybe_cleanup()
            if key not in self._buckets:
                self._buckets[key] = TokenBucket(
                    capacity=self.capacity,
                    refill_rate=self.refill_rate,
                )
            return self._buckets[key].consume(n)

    def _maybe_cleanup(self):
        """Remove old buckets to prevent memory leaks."""
        now = time.monotonic()
        if now - self._last_cleanup < self._cleanup_interval:
            return
        self._last_cleanup = now
        stale_keys = []
        for key, bucket in self._buckets.items():
            if now - bucket.last_refill > 3600:
                stale_keys.append(key)
        for key in stale_keys:
            del self._buckets[key]


# Global rate limiters
# Session creation: 5 per IP per hour = ~0.00139/sec
session_limiter = RateLimiter(capacity=5, refill_rate=5.0 / 3600)

# Scan rate: 20 per session per hour = ~0.00556/sec
scan_limiter = RateLimiter(capacity=20, refill_rate=20.0 / 3600)

# Global scan rate: 200 per hour = ~0.0556/sec
global_scan_limiter = RateLimiter(capacity=200, refill_rate=200.0 / 3600)
