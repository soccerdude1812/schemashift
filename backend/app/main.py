"""SchemaShift API — FastAPI application entry point.

Wires all routes, middleware, CORS, and startup events.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import ALLOWED_ORIGINS
from app.middleware.session_middleware import SessionMiddleware
from app.routes import health, session, scan, sources, recipes, demo

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("SchemaShift API starting up...")

    # Try to preload ML models at startup (non-blocking)
    try:
        from app.ml.pipeline import preload_models
        preload_models()
        logger.info("ML models preloaded successfully")
    except (ImportError, ModuleNotFoundError):
        logger.info("ML pipeline not available, will use mock pipeline")
    except Exception as e:
        logger.warning(f"Failed to preload ML models: {e}")

    # Verify Supabase connection
    try:
        from app.db.supabase_client import get_client
        client = get_client()
        logger.info("Supabase client initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")

    yield

    logger.info("SchemaShift API shutting down...")


app = FastAPI(
    title="SchemaShift API",
    version="0.1.0",
    description="Schema-aware data quality tool for data engineers",
    lifespan=lifespan,
)

# CORS middleware (must be added before custom middleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-RateLimit-Remaining", "X-RateLimit-Limit"],
)

# Session validation middleware
app.add_middleware(SessionMiddleware)

# Register route handlers
app.include_router(health.router)
app.include_router(session.router)
app.include_router(scan.router)
app.include_router(sources.router)
app.include_router(recipes.router)
app.include_router(demo.router)
