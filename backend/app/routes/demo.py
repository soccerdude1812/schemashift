"""Demo data seeding endpoint.

Seeds 3 demo sources with realistic schema/drift data.
Idempotent: checks if demo data exists before inserting.
"""

import logging
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.db import queries

logger = logging.getLogger(__name__)
router = APIRouter(tags=["demo"])


@router.post("/api/v1/demo/seed")
async def seed_demo_data(request: Request):
    """Seed demo sources, scans, and drift events for the current session.

    Creates 3 pre-populated demo sources:
    1. Stripe Payouts (financial CSV with drift progression)
    2. CRM Contacts (contact data with schema changes)
    3. Inventory Feed (product inventory JSON)

    Idempotent: if demo data already exists, returns existing data.
    """
    session_id = request.state.session_id

    try:
        # Check if demo data already exists
        existing = queries.get_demo_sources(session_id)
        if existing:
            return {
                "seeded": False,
                "message": "Demo data already exists",
                "sources": existing,
            }

        # Seed the demo data
        sources = queries.seed_demo_data(session_id)

        return JSONResponse(
            status_code=201,
            content={
                "seeded": True,
                "message": "Demo data seeded successfully",
                "sources": sources,
            },
        )
    except Exception as e:
        logger.error(f"Failed to seed demo data: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to seed demo data. Please try again.",
                "code": "demo_seed_error",
            },
        )
