"""Session management endpoint.

Sessions are anonymous UUIDs stored in localStorage on the frontend.
The X-Session-ID header is sent on every request.
"""

import logging
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.db import queries
from app.config import MAX_SESSIONS_PER_IP_PER_HOUR
from app.middleware.session_middleware import get_ip_hash
from app.utils.rate_limiter import session_limiter

logger = logging.getLogger(__name__)
router = APIRouter(tags=["session"])


@router.get("/api/v1/session")
async def get_or_create_session(request: Request):
    """Get existing session or create a new one.

    If X-Session-ID header exists and is valid, returns that session.
    If not, creates a new session (rate-limited: 5 per IP per hour).

    Returns:
        SessionResponse with session_id, plan, scan_count, etc.
    """
    ip_hash = get_ip_hash(request)
    session_id = request.headers.get("x-session-id", "").strip()

    # If session ID provided, try to retrieve it
    if session_id:
        try:
            session = queries.get_session(session_id)
            if session:
                return session
        except Exception as e:
            logger.error(f"Failed to get session {session_id[:8]}: {e}")

    # Rate limit new session creation
    if not session_limiter.allow(ip_hash):
        return JSONResponse(
            status_code=429,
            content={
                "error": "Too many sessions created. Please try again later.",
                "code": "rate_limit_exceeded",
                "details": {
                    "limit": MAX_SESSIONS_PER_IP_PER_HOUR,
                    "window": "1 hour",
                },
            },
        )

    # Also check DB-based count as primary gate
    try:
        recent_count = queries.count_sessions_by_ip(ip_hash, hours=1)
        if recent_count >= MAX_SESSIONS_PER_IP_PER_HOUR:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Too many sessions created. Please try again later.",
                    "code": "rate_limit_exceeded",
                    "details": {
                        "limit": MAX_SESSIONS_PER_IP_PER_HOUR,
                        "window": "1 hour",
                        "current": recent_count,
                    },
                },
            )
    except Exception as e:
        logger.error(f"Failed to count sessions by IP: {e}")

    # Create new session
    try:
        session = queries.create_session(ip_hash)
        return JSONResponse(
            status_code=201,
            content=session,
        )
    except Exception as e:
        logger.error(f"Failed to create session: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to create session. Please try again.",
                "code": "session_creation_error",
            },
        )
