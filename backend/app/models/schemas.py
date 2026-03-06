"""Pydantic models for API request/response schemas."""

from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


# --- Pagination ---

class PaginatedResponse(BaseModel):
    """Standard paginated response wrapper."""
    data: list[Any]
    total: int
    page: int
    limit: int
    has_more: bool


class PaginationParams(BaseModel):
    """Standard pagination query parameters."""
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)


# --- Session ---

class SessionResponse(BaseModel):
    session_id: str
    ip_hash: str
    scan_count: int = 0
    source_count: int = 0
    plan: str = "free"
    created_at: str


# --- Source ---

class SourceResponse(BaseModel):
    id: str
    session_id: str
    name: str
    fingerprint: Optional[str] = None
    baseline_schema: Optional[dict[str, Any]] = None
    format_info: Optional[dict[str, Any]] = None
    column_count: int = 0
    scan_count: int = 0
    is_demo: bool = False
    tags: Optional[list[str]] = None
    description: Optional[str] = None
    quality_score: Optional[dict[str, Any]] = None
    created_at: str
    updated_at: str
    last_scanned_at: Optional[str] = None


class SourceUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[list[str]] = None


# --- Scan ---

class ScanResponse(BaseModel):
    id: str
    session_id: str
    source_id: str
    filename: str
    file_size_bytes: int = 0
    format_info: Optional[dict[str, Any]] = None
    schema_snapshot: Optional[dict[str, Any]] = None
    drift_summary: Optional[dict[str, Any]] = None
    anomalies: Optional[dict[str, Any]] = None
    quality_score: Optional[dict[str, Any]] = None
    recipes_applied: Optional[list[dict[str, Any]]] = None
    row_count: int = 0
    column_count: int = 0
    is_baseline: bool = False
    created_at: str


# --- Drift Event ---

class DriftEventResponse(BaseModel):
    id: str
    source_id: str
    scan_id: str
    event_type: str
    severity: str
    column_name: Optional[str] = None
    details: Optional[dict[str, Any]] = None
    created_at: str


# --- Recipe ---

class RecipeCreateRequest(BaseModel):
    operation: str
    column_name: Optional[str] = None
    params: Optional[dict[str, Any]] = None
    description: Optional[str] = None
    enabled: bool = True
    order_index: int = 0


class RecipeUpdateRequest(BaseModel):
    operation: Optional[str] = None
    column_name: Optional[str] = None
    params: Optional[dict[str, Any]] = None
    description: Optional[str] = None
    enabled: Optional[bool] = None
    order_index: Optional[int] = None


class RecipeResponse(BaseModel):
    id: str
    source_id: str
    session_id: str
    operation: str
    column_name: Optional[str] = None
    params: Optional[dict[str, Any]] = None
    description: Optional[str] = None
    enabled: bool = True
    order_index: int = 0
    created_at: str
    updated_at: str


class RecipeReorderRequest(BaseModel):
    recipe_ids: list[str]


# --- Error ---

class ErrorResponse(BaseModel):
    error: str
    code: str
    details: Optional[Any] = None
