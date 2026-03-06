"""Health check endpoint."""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/api/v1/health")
async def health_check():
    """Simple health check. Returns 200 if the service is running."""
    return {
        "status": "ok",
        "version": "0.1.0",
        "service": "schemashift-api",
    }
