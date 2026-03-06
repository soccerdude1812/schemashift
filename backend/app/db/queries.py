"""Database queries for all tables using supabase-py.

All queries MUST filter by session_id for data isolation.
Table names use ss_ prefix: ss_sessions, ss_sources, ss_scans, ss_recipes, ss_drift_events.
"""

import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Optional

from app.db.supabase_client import get_client


# ============================================================
# Session Queries
# ============================================================

def create_session(ip_hash: str) -> dict[str, Any]:
    """Create a new anonymous session bound to an IP hash."""
    client = get_client()
    session_id = str(uuid.uuid4())
    data = {
        "id": session_id,
        "ip_hash": ip_hash,
        "scan_count": 0,
        "source_count": 0,
        "plan": "free",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = client.table("ss_sessions").insert(data).execute()
    return result.data[0] if result.data else data


def get_session(session_id: str) -> Optional[dict[str, Any]]:
    """Get a session by ID."""
    client = get_client()
    result = (
        client.table("ss_sessions")
        .select("*")
        .eq("id", session_id)
        .execute()
    )
    return result.data[0] if result.data else None


def count_sessions_by_ip(ip_hash: str, hours: int = 1) -> int:
    """Count sessions created by an IP hash within the last N hours."""
    client = get_client()
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    result = (
        client.table("ss_sessions")
        .select("id", count="exact")
        .eq("ip_hash", ip_hash)
        .gte("created_at", cutoff)
        .execute()
    )
    return result.count if result.count is not None else 0


def increment_scan_count(session_id: str) -> None:
    """Increment the scan_count on a session."""
    client = get_client()
    session = get_session(session_id)
    if session:
        new_count = (session.get("scan_count") or 0) + 1
        client.table("ss_sessions").update(
            {"scan_count": new_count}
        ).eq("id", session_id).execute()


def increment_source_count(session_id: str) -> None:
    """Increment the source_count on a session."""
    client = get_client()
    session = get_session(session_id)
    if session:
        new_count = (session.get("source_count") or 0) + 1
        client.table("ss_sessions").update(
            {"source_count": new_count}
        ).eq("id", session_id).execute()


# ============================================================
# Source Queries
# ============================================================

def create_source(
    session_id: str,
    name: str,
    fingerprint: str | None = None,
    baseline_schema: dict | None = None,
    format_info: dict | None = None,
    column_count: int = 0,
    is_demo: bool = False,
    description: str | None = None,
    tags: list[str] | None = None,
) -> dict[str, Any]:
    """Create a new data source."""
    client = get_client()
    now = datetime.now(timezone.utc).isoformat()
    data = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "name": name,
        "fingerprint": fingerprint,
        "baseline_schema": json.dumps(baseline_schema) if baseline_schema else None,
        "format_info": json.dumps(format_info) if format_info else None,
        "column_count": column_count,
        "scan_count": 0,
        "is_demo": is_demo,
        "description": description,
        "tags": tags,
        "created_at": now,
        "updated_at": now,
        "last_scanned_at": None,
    }
    result = client.table("ss_sources").insert(data).execute()
    row = result.data[0] if result.data else data
    # Parse JSON fields
    row = _parse_source_json(row)
    return row


def get_sources(
    session_id: str, page: int = 1, limit: int = 20
) -> dict[str, Any]:
    """Get paginated sources for a session."""
    client = get_client()
    offset = (page - 1) * limit

    # Get total count
    count_result = (
        client.table("ss_sources")
        .select("id", count="exact")
        .eq("session_id", session_id)
        .execute()
    )
    total = count_result.count if count_result.count is not None else 0

    # Get paginated data
    result = (
        client.table("ss_sources")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    sources = [_parse_source_json(s) for s in (result.data or [])]

    return {
        "data": sources,
        "total": total,
        "page": page,
        "limit": limit,
        "has_more": offset + limit < total,
    }


def get_source(source_id: str, session_id: str) -> Optional[dict[str, Any]]:
    """Get a single source by ID, filtered by session_id."""
    client = get_client()
    result = (
        client.table("ss_sources")
        .select("*")
        .eq("id", source_id)
        .eq("session_id", session_id)
        .execute()
    )
    if not result.data:
        return None
    return _parse_source_json(result.data[0])


def update_source(
    source_id: str, session_id: str, updates: dict[str, Any]
) -> Optional[dict[str, Any]]:
    """Update a source. Only allows specific fields."""
    client = get_client()
    allowed_fields = {
        "name", "description", "tags", "baseline_schema",
        "format_info", "column_count", "fingerprint",
        "scan_count", "last_scanned_at",
    }
    filtered = {}
    for k, v in updates.items():
        if k in allowed_fields:
            if k in ("baseline_schema", "format_info") and isinstance(v, dict):
                filtered[k] = json.dumps(v)
            else:
                filtered[k] = v
    filtered["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = (
        client.table("ss_sources")
        .update(filtered)
        .eq("id", source_id)
        .eq("session_id", session_id)
        .execute()
    )
    if not result.data:
        return None
    return _parse_source_json(result.data[0])


def delete_source(source_id: str, session_id: str) -> bool:
    """Delete a source and cascade to scans, recipes, drift events."""
    client = get_client()

    # Verify ownership
    source = get_source(source_id, session_id)
    if not source:
        return False

    # Cascade delete: drift_events -> scans -> recipes -> source
    client.table("ss_drift_events").delete().eq(
        "source_id", source_id
    ).execute()
    client.table("ss_scans").delete().eq(
        "source_id", source_id
    ).eq("session_id", session_id).execute()
    client.table("ss_recipes").delete().eq(
        "source_id", source_id
    ).eq("session_id", session_id).execute()
    client.table("ss_sources").delete().eq(
        "id", source_id
    ).eq("session_id", session_id).execute()

    return True


def find_source_by_fingerprint(
    session_id: str, fingerprint: str
) -> Optional[dict[str, Any]]:
    """Find a source by its MinHash fingerprint within a session."""
    client = get_client()
    result = (
        client.table("ss_sources")
        .select("*")
        .eq("session_id", session_id)
        .eq("fingerprint", fingerprint)
        .execute()
    )
    if not result.data:
        return None
    return _parse_source_json(result.data[0])


def _parse_source_json(source: dict[str, Any]) -> dict[str, Any]:
    """Parse JSON string fields on a source record."""
    for field in ("baseline_schema", "format_info"):
        val = source.get(field)
        if isinstance(val, str):
            try:
                source[field] = json.loads(val)
            except (json.JSONDecodeError, TypeError):
                pass
    return source


# ============================================================
# Scan Queries
# ============================================================

def create_scan(data: dict[str, Any]) -> dict[str, Any]:
    """Create a new scan record."""
    client = get_client()
    scan_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    # Serialize JSON fields
    record = {
        "id": scan_id,
        "session_id": data["session_id"],
        "source_id": data["source_id"],
        "filename": data.get("filename", "unknown"),
        "file_size_bytes": data.get("file_size_bytes", 0),
        "format_info": json.dumps(data.get("format_info")) if data.get("format_info") else None,
        "schema_snapshot": json.dumps(data.get("schema_snapshot")) if data.get("schema_snapshot") else None,
        "drift_summary": json.dumps(data.get("drift_summary")) if data.get("drift_summary") else None,
        "anomalies": json.dumps(data.get("anomalies")) if data.get("anomalies") else None,
        "quality_score": json.dumps(data.get("quality_score")) if data.get("quality_score") else None,
        "recipes_applied": json.dumps(data.get("recipes_applied")) if data.get("recipes_applied") else None,
        "row_count": data.get("row_count", 0),
        "column_count": data.get("column_count", 0),
        "is_baseline": data.get("is_baseline", False),
        "created_at": now,
    }

    result = client.table("ss_scans").insert(record).execute()
    row = result.data[0] if result.data else record
    return _parse_scan_json(row)


def get_scan(scan_id: str, session_id: str) -> Optional[dict[str, Any]]:
    """Get a scan by ID, filtered by session_id."""
    client = get_client()
    result = (
        client.table("ss_scans")
        .select("*")
        .eq("id", scan_id)
        .eq("session_id", session_id)
        .execute()
    )
    if not result.data:
        return None
    return _parse_scan_json(result.data[0])


def get_scans_for_source(
    source_id: str, session_id: str, page: int = 1, limit: int = 20
) -> dict[str, Any]:
    """Get paginated scans for a source."""
    client = get_client()
    offset = (page - 1) * limit

    count_result = (
        client.table("ss_scans")
        .select("id", count="exact")
        .eq("source_id", source_id)
        .eq("session_id", session_id)
        .execute()
    )
    total = count_result.count if count_result.count is not None else 0

    result = (
        client.table("ss_scans")
        .select("*")
        .eq("source_id", source_id)
        .eq("session_id", session_id)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    scans = [_parse_scan_json(s) for s in (result.data or [])]

    return {
        "data": scans,
        "total": total,
        "page": page,
        "limit": limit,
        "has_more": offset + limit < total,
    }


def delete_scan(scan_id: str, session_id: str) -> bool:
    """Delete a single scan and its associated drift events."""
    client = get_client()
    scan = get_scan(scan_id, session_id)
    if not scan:
        return False

    # Delete drift events for this scan
    client.table("ss_drift_events").delete().eq("scan_id", scan_id).execute()

    # Delete the scan
    client.table("ss_scans").delete().eq(
        "id", scan_id
    ).eq("session_id", session_id).execute()

    return True


def _parse_scan_json(scan: dict[str, Any]) -> dict[str, Any]:
    """Parse JSON string fields on a scan record."""
    json_fields = (
        "format_info", "schema_snapshot", "drift_summary",
        "anomalies", "quality_score", "recipes_applied",
    )
    for field in json_fields:
        val = scan.get(field)
        if isinstance(val, str):
            try:
                scan[field] = json.loads(val)
            except (json.JSONDecodeError, TypeError):
                pass
    return scan


# ============================================================
# Drift Event Queries
# ============================================================

def create_drift_events(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Bulk insert drift events."""
    if not events:
        return []
    client = get_client()
    now = datetime.now(timezone.utc).isoformat()
    records = []
    for event in events:
        records.append({
            "id": str(uuid.uuid4()),
            "source_id": event["source_id"],
            "scan_id": event["scan_id"],
            "session_id": event.get("session_id"),
            "event_type": event["event_type"],
            "severity": event.get("severity", "info"),
            "column_name": event.get("column_name"),
            "details": json.dumps(event.get("details")) if event.get("details") else None,
            "created_at": now,
        })

    result = client.table("ss_drift_events").insert(records).execute()
    rows = result.data or records
    return [_parse_drift_json(r) for r in rows]


def get_drift_timeline(
    source_id: str,
    session_id: str,
    page: int = 1,
    limit: int = 20,
    from_date: str | None = None,
    to_date: str | None = None,
) -> dict[str, Any]:
    """Get paginated drift events for a source with optional date filters."""
    client = get_client()
    offset = (page - 1) * limit

    # Build count query
    count_q = (
        client.table("ss_drift_events")
        .select("id", count="exact")
        .eq("source_id", source_id)
        .eq("session_id", session_id)
    )
    if from_date:
        count_q = count_q.gte("created_at", from_date)
    if to_date:
        count_q = count_q.lte("created_at", to_date)
    count_result = count_q.execute()
    total = count_result.count if count_result.count is not None else 0

    # Build data query
    data_q = (
        client.table("ss_drift_events")
        .select("*")
        .eq("source_id", source_id)
        .eq("session_id", session_id)
    )
    if from_date:
        data_q = data_q.gte("created_at", from_date)
    if to_date:
        data_q = data_q.lte("created_at", to_date)

    result = (
        data_q
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    events = [_parse_drift_json(e) for e in (result.data or [])]

    return {
        "data": events,
        "total": total,
        "page": page,
        "limit": limit,
        "has_more": offset + limit < total,
    }


def _parse_drift_json(event: dict[str, Any]) -> dict[str, Any]:
    """Parse JSON string fields on a drift event record."""
    val = event.get("details")
    if isinstance(val, str):
        try:
            event["details"] = json.loads(val)
        except (json.JSONDecodeError, TypeError):
            pass
    return event


# ============================================================
# Recipe Queries
# ============================================================

def create_recipe(
    source_id: str,
    session_id: str,
    data: dict[str, Any],
) -> dict[str, Any]:
    """Create a new recipe for a source."""
    client = get_client()
    now = datetime.now(timezone.utc).isoformat()
    record = {
        "id": str(uuid.uuid4()),
        "source_id": source_id,
        "session_id": session_id,
        "operation": data["operation"],
        "column_name": data.get("column_name"),
        "params": json.dumps(data.get("params")) if data.get("params") else None,
        "description": data.get("description"),
        "enabled": data.get("enabled", True),
        "order_index": data.get("order_index", 0),
        "created_at": now,
        "updated_at": now,
    }
    result = client.table("ss_recipes").insert(record).execute()
    row = result.data[0] if result.data else record
    return _parse_recipe_json(row)


def get_recipes(source_id: str, session_id: str) -> list[dict[str, Any]]:
    """Get all recipes for a source, ordered by order_index."""
    client = get_client()
    result = (
        client.table("ss_recipes")
        .select("*")
        .eq("source_id", source_id)
        .eq("session_id", session_id)
        .order("order_index", desc=False)
        .execute()
    )
    return [_parse_recipe_json(r) for r in (result.data or [])]


def get_recipe(
    recipe_id: str, source_id: str, session_id: str
) -> Optional[dict[str, Any]]:
    """Get a single recipe."""
    client = get_client()
    result = (
        client.table("ss_recipes")
        .select("*")
        .eq("id", recipe_id)
        .eq("source_id", source_id)
        .eq("session_id", session_id)
        .execute()
    )
    if not result.data:
        return None
    return _parse_recipe_json(result.data[0])


def update_recipe(
    recipe_id: str,
    source_id: str,
    session_id: str,
    updates: dict[str, Any],
) -> Optional[dict[str, Any]]:
    """Update a recipe."""
    client = get_client()
    allowed_fields = {
        "operation", "column_name", "params",
        "description", "enabled", "order_index",
    }
    filtered = {}
    for k, v in updates.items():
        if k in allowed_fields:
            if k == "params" and isinstance(v, dict):
                filtered[k] = json.dumps(v)
            else:
                filtered[k] = v
    filtered["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = (
        client.table("ss_recipes")
        .update(filtered)
        .eq("id", recipe_id)
        .eq("source_id", source_id)
        .eq("session_id", session_id)
        .execute()
    )
    if not result.data:
        return None
    return _parse_recipe_json(result.data[0])


def delete_recipe(
    recipe_id: str, source_id: str, session_id: str
) -> bool:
    """Delete a recipe."""
    client = get_client()
    recipe = get_recipe(recipe_id, source_id, session_id)
    if not recipe:
        return False
    client.table("ss_recipes").delete().eq(
        "id", recipe_id
    ).eq("source_id", source_id).eq("session_id", session_id).execute()
    return True


def reorder_recipes(
    source_id: str, session_id: str, recipe_ids: list[str]
) -> list[dict[str, Any]]:
    """Reorder recipes by updating order_index based on position in list."""
    client = get_client()
    now = datetime.now(timezone.utc).isoformat()
    for idx, recipe_id in enumerate(recipe_ids):
        client.table("ss_recipes").update(
            {"order_index": idx, "updated_at": now}
        ).eq("id", recipe_id).eq(
            "source_id", source_id
        ).eq("session_id", session_id).execute()

    return get_recipes(source_id, session_id)


def _parse_recipe_json(recipe: dict[str, Any]) -> dict[str, Any]:
    """Parse JSON string fields on a recipe record."""
    val = recipe.get("params")
    if isinstance(val, str):
        try:
            recipe["params"] = json.loads(val)
        except (json.JSONDecodeError, TypeError):
            pass
    return recipe


# ============================================================
# Demo Data
# ============================================================

def get_demo_sources(session_id: str) -> list[dict[str, Any]]:
    """Get demo sources for a session."""
    client = get_client()
    result = (
        client.table("ss_sources")
        .select("*")
        .eq("session_id", session_id)
        .eq("is_demo", True)
        .execute()
    )
    return [_parse_source_json(s) for s in (result.data or [])]


def seed_demo_data(session_id: str) -> list[dict[str, Any]]:
    """Seed demo sources, scans, and drift events for a session.

    Idempotent: checks if demo data already exists before inserting.
    Creates 3 demo sources with realistic schema/drift data:
    1. Stripe Payouts (financial CSV)
    2. CRM Contacts (contact data)
    3. Inventory Feed (product inventory)
    """
    # Check if demo data already exists
    existing = get_demo_sources(session_id)
    if existing:
        return existing

    now = datetime.now(timezone.utc)
    sources = []

    # --- Source 1: Stripe Payouts ---
    stripe_schema = {
        "columns": [
            {"name": "payout_id", "dtype": "string", "semantic_type": "identifier", "null_rate": 0.0, "cardinality": 1.0, "sample_values": ["po_1A2B3C", "po_4D5E6F"]},
            {"name": "amount", "dtype": "float64", "semantic_type": "currency", "null_rate": 0.0, "cardinality": 0.85, "sample_values": ["150.00", "2499.99"]},
            {"name": "currency", "dtype": "string", "semantic_type": "categorical", "null_rate": 0.0, "cardinality": 0.02, "sample_values": ["usd", "eur"]},
            {"name": "status", "dtype": "string", "semantic_type": "categorical", "null_rate": 0.0, "cardinality": 0.01, "sample_values": ["paid", "pending"]},
            {"name": "arrival_date", "dtype": "string", "semantic_type": "date", "null_rate": 0.0, "cardinality": 0.3, "sample_values": ["2026-01-15", "2026-02-01"]},
            {"name": "description", "dtype": "string", "semantic_type": "text", "null_rate": 0.15, "cardinality": 0.7, "sample_values": ["Monthly payout", "Weekly settlement"]},
        ]
    }
    stripe_source = create_source(
        session_id=session_id,
        name="Stripe Payouts",
        fingerprint="demo_stripe_payouts_v1",
        baseline_schema=stripe_schema,
        format_info={"format": "csv", "encoding": "utf-8", "delimiter": ","},
        column_count=6,
        is_demo=True,
        description="Weekly payout exports from Stripe dashboard",
        tags=["finance", "payments", "stripe"],
    )
    sources.append(stripe_source)

    # Create scans for Stripe
    for i in range(4):
        scan_time = (now - timedelta(days=7 * (3 - i))).isoformat()
        drift_summary = None
        is_baseline = (i == 0)
        if i == 2:
            drift_summary = {
                "total_changes": 2,
                "columns_added": ["fee_amount"],
                "columns_removed": [],
                "type_changes": [{"column": "amount", "from": "currency", "to": "float"}],
                "null_rate_changes": [{"column": "description", "from": 0.15, "to": 0.35}],
            }
        if i == 3:
            drift_summary = {
                "total_changes": 1,
                "columns_added": [],
                "columns_removed": [],
                "type_changes": [],
                "null_rate_changes": [{"column": "description", "from": 0.35, "to": 0.05}],
            }

        scan = create_scan({
            "session_id": session_id,
            "source_id": stripe_source["id"],
            "filename": f"payouts_week_{i + 1}.csv",
            "file_size_bytes": 45000 + i * 5000,
            "format_info": {"format": "csv", "encoding": "utf-8", "delimiter": ","},
            "schema_snapshot": stripe_schema,
            "drift_summary": drift_summary,
            "row_count": 150 + i * 30,
            "column_count": 6 + (1 if i >= 2 else 0),
            "is_baseline": is_baseline,
            "quality_score": {"score": 85 - i * 5, "label": "Good", "factors": {}, "trend": "stable"},
        })

        # Create drift events for scan 3
        if i == 2:
            create_drift_events([
                {
                    "source_id": stripe_source["id"],
                    "scan_id": scan["id"],
                    "session_id": session_id,
                    "event_type": "column_added",
                    "severity": "warning",
                    "column_name": "fee_amount",
                    "details": {"message": "New column 'fee_amount' detected in payout export"},
                },
                {
                    "source_id": stripe_source["id"],
                    "scan_id": scan["id"],
                    "session_id": session_id,
                    "event_type": "null_rate_spike",
                    "severity": "warning",
                    "column_name": "description",
                    "details": {"from": 0.15, "to": 0.35, "message": "Null rate increased from 15% to 35%"},
                },
            ])

    # --- Source 2: CRM Contacts ---
    crm_schema = {
        "columns": [
            {"name": "contact_id", "dtype": "int64", "semantic_type": "identifier", "null_rate": 0.0, "cardinality": 1.0, "sample_values": ["10001", "10002"]},
            {"name": "first_name", "dtype": "string", "semantic_type": "name", "null_rate": 0.02, "cardinality": 0.8, "sample_values": ["Alice", "Bob"]},
            {"name": "last_name", "dtype": "string", "semantic_type": "name", "null_rate": 0.02, "cardinality": 0.85, "sample_values": ["Smith", "Johnson"]},
            {"name": "email", "dtype": "string", "semantic_type": "email", "null_rate": 0.05, "cardinality": 0.98, "sample_values": ["alice@example.com"]},
            {"name": "phone", "dtype": "string", "semantic_type": "phone", "null_rate": 0.25, "cardinality": 0.95, "sample_values": ["+1-555-0101"]},
            {"name": "company", "dtype": "string", "semantic_type": "categorical", "null_rate": 0.1, "cardinality": 0.4, "sample_values": ["Acme Inc"]},
            {"name": "created_date", "dtype": "string", "semantic_type": "date", "null_rate": 0.0, "cardinality": 0.6, "sample_values": ["2025-06-15"]},
            {"name": "lifecycle_stage", "dtype": "string", "semantic_type": "categorical", "null_rate": 0.0, "cardinality": 0.02, "sample_values": ["lead", "customer"]},
        ]
    }
    crm_source = create_source(
        session_id=session_id,
        name="CRM Contacts",
        fingerprint="demo_crm_contacts_v1",
        baseline_schema=crm_schema,
        format_info={"format": "csv", "encoding": "utf-8", "delimiter": ","},
        column_count=8,
        is_demo=True,
        description="Weekly contact export from HubSpot CRM",
        tags=["crm", "contacts", "hubspot"],
    )
    sources.append(crm_source)

    # Create scans for CRM
    for i in range(5):
        scan_time = (now - timedelta(days=7 * (4 - i))).isoformat()
        drift_summary = None
        is_baseline = (i == 0)
        if i == 3:
            drift_summary = {
                "total_changes": 3,
                "columns_added": ["lead_score"],
                "columns_removed": ["lifecycle_stage"],
                "type_changes": [{"column": "contact_id", "from": "identifier", "to": "string"}],
                "null_rate_changes": [],
            }

        scan = create_scan({
            "session_id": session_id,
            "source_id": crm_source["id"],
            "filename": f"contacts_export_{i + 1}.csv",
            "file_size_bytes": 120000 + i * 15000,
            "format_info": {"format": "csv", "encoding": "utf-8", "delimiter": ","},
            "schema_snapshot": crm_schema,
            "drift_summary": drift_summary,
            "row_count": 500 + i * 50,
            "column_count": 8,
            "is_baseline": is_baseline,
            "quality_score": {"score": 78 - (5 if i == 3 else 0), "label": "Good", "factors": {}, "trend": "stable"},
        })

        if i == 3:
            create_drift_events([
                {
                    "source_id": crm_source["id"],
                    "scan_id": scan["id"],
                    "session_id": session_id,
                    "event_type": "column_added",
                    "severity": "info",
                    "column_name": "lead_score",
                    "details": {"message": "New column 'lead_score' appeared in CRM export"},
                },
                {
                    "source_id": crm_source["id"],
                    "scan_id": scan["id"],
                    "session_id": session_id,
                    "event_type": "column_removed",
                    "severity": "critical",
                    "column_name": "lifecycle_stage",
                    "details": {"message": "Column 'lifecycle_stage' is missing from this export"},
                },
                {
                    "source_id": crm_source["id"],
                    "scan_id": scan["id"],
                    "session_id": session_id,
                    "event_type": "type_change",
                    "severity": "warning",
                    "column_name": "contact_id",
                    "details": {"from": "identifier", "to": "string", "message": "contact_id changed from integer to string"},
                },
            ])

    # --- Source 3: Inventory Feed ---
    inv_schema = {
        "columns": [
            {"name": "sku", "dtype": "string", "semantic_type": "identifier", "null_rate": 0.0, "cardinality": 1.0, "sample_values": ["SKU-001", "SKU-002"]},
            {"name": "product_name", "dtype": "string", "semantic_type": "text", "null_rate": 0.0, "cardinality": 0.95, "sample_values": ["Widget A", "Gadget B"]},
            {"name": "quantity", "dtype": "int64", "semantic_type": "numeric", "null_rate": 0.0, "cardinality": 0.3, "sample_values": ["100", "250"]},
            {"name": "price", "dtype": "float64", "semantic_type": "currency", "null_rate": 0.0, "cardinality": 0.6, "sample_values": ["19.99", "49.99"]},
            {"name": "warehouse", "dtype": "string", "semantic_type": "categorical", "null_rate": 0.0, "cardinality": 0.01, "sample_values": ["US-WEST", "US-EAST"]},
            {"name": "last_restock", "dtype": "string", "semantic_type": "date", "null_rate": 0.1, "cardinality": 0.4, "sample_values": ["2026-01-20"]},
        ]
    }
    inv_source = create_source(
        session_id=session_id,
        name="Inventory Feed",
        fingerprint="demo_inventory_feed_v1",
        baseline_schema=inv_schema,
        format_info={"format": "json", "encoding": "utf-8", "delimiter": None},
        column_count=6,
        is_demo=True,
        description="Daily inventory sync from warehouse management system",
        tags=["inventory", "warehouse", "supply-chain"],
    )
    sources.append(inv_source)

    # Create scans for Inventory
    for i in range(3):
        scan_time = (now - timedelta(days=3 * (2 - i))).isoformat()
        drift_summary = None
        is_baseline = (i == 0)
        if i == 2:
            drift_summary = {
                "total_changes": 1,
                "columns_added": ["category"],
                "columns_removed": [],
                "type_changes": [],
                "null_rate_changes": [{"column": "last_restock", "from": 0.1, "to": 0.4}],
            }

        scan = create_scan({
            "session_id": session_id,
            "source_id": inv_source["id"],
            "filename": f"inventory_feed_{i + 1}.json",
            "file_size_bytes": 85000 + i * 10000,
            "format_info": {"format": "json", "encoding": "utf-8", "delimiter": None},
            "schema_snapshot": inv_schema,
            "drift_summary": drift_summary,
            "row_count": 300 + i * 20,
            "column_count": 6 + (1 if i == 2 else 0),
            "is_baseline": is_baseline,
            "quality_score": {"score": 90 - i * 3, "label": "Excellent", "factors": {}, "trend": "stable"},
        })

        if i == 2:
            create_drift_events([
                {
                    "source_id": inv_source["id"],
                    "scan_id": scan["id"],
                    "session_id": session_id,
                    "event_type": "column_added",
                    "severity": "info",
                    "column_name": "category",
                    "details": {"message": "New column 'category' detected in inventory feed"},
                },
                {
                    "source_id": inv_source["id"],
                    "scan_id": scan["id"],
                    "session_id": session_id,
                    "event_type": "null_rate_spike",
                    "severity": "warning",
                    "column_name": "last_restock",
                    "details": {"from": 0.1, "to": 0.4, "message": "Null rate for 'last_restock' increased from 10% to 40%"},
                },
            ])

    # Update source counts on session
    session = get_session(session_id)
    if session:
        client = get_client()
        client.table("ss_sessions").update(
            {"source_count": (session.get("source_count") or 0) + 3}
        ).eq("id", session_id).execute()

    return sources
