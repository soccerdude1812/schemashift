"""Session validation middleware.

Validates the X-Session-ID header on all API routes (except health and session creation).
Attaches the session data to the request state for use by route handlers.
"""

import hashlib
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.db import queries

logger = logging.getLogger(__name__)

# Routes that do NOT require a session
EXEMPT_PATHS = {
    "/api/v1/health",
    "/api/v1/session",
    "/docs",
    "/openapi.json",
    "/redoc",
}


def get_ip_hash(request: Request) -> str:
    """Get a SHA-256 hash of the client IP for privacy-safe identification."""
    # Check forwarded headers (for proxied deployments)
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        ip = forwarded.split(",")[0].strip()
    else:
        ip = request.client.host if request.client else "unknown"

    return hashlib.sha256(ip.encode()).hexdigest()[:16]


class SessionMiddleware(BaseHTTPMiddleware):
    """Middleware that validates X-Session-ID header on protected routes."""

    async def dispatch(self, request: Request, call_next):
        # Skip middleware for exempt paths and OPTIONS (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)

        path = request.url.path.rstrip("/")
        if path in EXEMPT_PATHS or not path.startswith("/api/"):
            return await call_next(request)

        session_id = request.headers.get("x-session-id", "").strip()
        if not session_id:
            return JSONResponse(
                status_code=401,
                content={
                    "error": "Missing X-Session-ID header",
                    "code": "session_required",
                },
            )

        # Validate session exists in DB
        try:
            session = queries.get_session(session_id)
        except Exception as e:
            logger.error(f"Failed to validate session: {e}")
            return JSONResponse(
                status_code=503,
                content={
                    "error": "Unable to validate session. Please try again.",
                    "code": "session_validation_error",
                },
            )

        if not session:
            return JSONResponse(
                status_code=401,
                content={
                    "error": "Invalid or expired session",
                    "code": "session_invalid",
                },
            )

        # Log IP mismatch (but don't block -- accept risk per plan)
        current_ip_hash = get_ip_hash(request)
        if session.get("ip_hash") and session["ip_hash"] != current_ip_hash:
            logger.warning(
                f"Session {session_id[:8]}... IP mismatch: "
                f"expected {session['ip_hash'][:8]}, got {current_ip_hash[:8]}"
            )

        # Attach session to request state
        request.state.session = session
        request.state.session_id = session_id

        return await call_next(request)
