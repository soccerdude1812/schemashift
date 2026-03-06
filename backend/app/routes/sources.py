"""Source CRUD endpoints.

All endpoints filter by session_id from the validated session middleware.
"""

import logging
from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse

from app.db import queries
from app.config import DEFAULT_PAGE, DEFAULT_LIMIT, MAX_LIMIT
from app.utils.quality_scorer import compute_quality_score

logger = logging.getLogger(__name__)
router = APIRouter(tags=["sources"])


@router.get("/api/v1/sources")
async def list_sources(
    request: Request,
    page: int = Query(DEFAULT_PAGE, ge=1),
    limit: int = Query(DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
):
    """List all sources for the current session (paginated)."""
    session_id = request.state.session_id
    try:
        result = queries.get_sources(session_id, page=page, limit=limit)

        # Enrich each source with quality score
        for source in result["data"]:
            try:
                drift_timeline = queries.get_drift_timeline(
                    source["id"], session_id, page=1, limit=10
                )
                quality = compute_quality_score(
                    schema=source.get("baseline_schema"),
                    drift_events=drift_timeline.get("data", []),
                    scan_count=source.get("scan_count", 0),
                    last_scan_at=source.get("last_scanned_at"),
                )
                source["quality_score"] = quality
            except Exception:
                source["quality_score"] = None

        return result
    except Exception as e:
        logger.error(f"Failed to list sources: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to retrieve sources",
                "code": "list_sources_error",
            },
        )


@router.get("/api/v1/sources/{source_id}")
async def get_source(request: Request, source_id: str):
    """Get a single source by ID."""
    session_id = request.state.session_id
    try:
        source = queries.get_source(source_id, session_id)
        if not source:
            return JSONResponse(
                status_code=404,
                content={
                    "error": "Source not found",
                    "code": "source_not_found",
                },
            )

        # Enrich with quality score
        try:
            drift_timeline = queries.get_drift_timeline(
                source_id, session_id, page=1, limit=10
            )
            quality = compute_quality_score(
                schema=source.get("baseline_schema"),
                drift_events=drift_timeline.get("data", []),
                scan_count=source.get("scan_count", 0),
                last_scan_at=source.get("last_scanned_at"),
            )
            source["quality_score"] = quality
        except Exception:
            source["quality_score"] = None

        return source
    except Exception as e:
        logger.error(f"Failed to get source {source_id}: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to retrieve source",
                "code": "get_source_error",
            },
        )


@router.put("/api/v1/sources/{source_id}")
async def update_source(request: Request, source_id: str):
    """Update a source's name, description, or tags."""
    session_id = request.state.session_id

    try:
        body = await request.json()
    except Exception:
        return JSONResponse(
            status_code=400,
            content={
                "error": "Invalid JSON body",
                "code": "invalid_json",
            },
        )

    # Only allow specific fields
    allowed = {"name", "description", "tags"}
    updates = {k: v for k, v in body.items() if k in allowed}

    if not updates:
        return JSONResponse(
            status_code=400,
            content={
                "error": "No valid fields to update. Allowed: name, description, tags",
                "code": "no_valid_fields",
            },
        )

    # Validate name if provided
    if "name" in updates:
        name = updates["name"]
        if not isinstance(name, str) or not name.strip():
            return JSONResponse(
                status_code=400,
                content={
                    "error": "Name must be a non-empty string",
                    "code": "invalid_name",
                },
            )
        updates["name"] = name.strip()[:200]

    # Validate tags if provided
    if "tags" in updates:
        tags = updates["tags"]
        if not isinstance(tags, list):
            return JSONResponse(
                status_code=400,
                content={
                    "error": "Tags must be an array of strings",
                    "code": "invalid_tags",
                },
            )
        updates["tags"] = [str(t).strip()[:50] for t in tags[:20]]

    # Validate description if provided
    if "description" in updates:
        desc = updates["description"]
        if desc is not None and not isinstance(desc, str):
            return JSONResponse(
                status_code=400,
                content={
                    "error": "Description must be a string or null",
                    "code": "invalid_description",
                },
            )
        if isinstance(desc, str):
            updates["description"] = desc.strip()[:1000]

    try:
        updated = queries.update_source(source_id, session_id, updates)
        if not updated:
            return JSONResponse(
                status_code=404,
                content={
                    "error": "Source not found",
                    "code": "source_not_found",
                },
            )
        return updated
    except Exception as e:
        logger.error(f"Failed to update source {source_id}: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to update source",
                "code": "update_source_error",
            },
        )


@router.delete("/api/v1/sources/{source_id}")
async def delete_source(request: Request, source_id: str):
    """Delete a source and all associated data (scans, recipes, drift events)."""
    session_id = request.state.session_id
    try:
        deleted = queries.delete_source(source_id, session_id)
        if not deleted:
            return JSONResponse(
                status_code=404,
                content={
                    "error": "Source not found",
                    "code": "source_not_found",
                },
            )
        return JSONResponse(status_code=204, content=None)
    except Exception as e:
        logger.error(f"Failed to delete source {source_id}: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to delete source",
                "code": "delete_source_error",
            },
        )


@router.get("/api/v1/sources/{source_id}/history")
async def get_source_history(
    request: Request,
    source_id: str,
    page: int = Query(DEFAULT_PAGE, ge=1),
    limit: int = Query(DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
):
    """Get scan history for a source (paginated)."""
    session_id = request.state.session_id

    # Verify source exists and belongs to session
    source = queries.get_source(source_id, session_id)
    if not source:
        return JSONResponse(
            status_code=404,
            content={
                "error": "Source not found",
                "code": "source_not_found",
            },
        )

    try:
        return queries.get_scans_for_source(source_id, session_id, page=page, limit=limit)
    except Exception as e:
        logger.error(f"Failed to get history for source {source_id}: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to retrieve scan history",
                "code": "get_history_error",
            },
        )


@router.get("/api/v1/sources/{source_id}/drift-timeline")
async def get_drift_timeline(
    request: Request,
    source_id: str,
    page: int = Query(DEFAULT_PAGE, ge=1),
    limit: int = Query(DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
):
    """Get drift events for a source (paginated, with optional date filters)."""
    session_id = request.state.session_id

    # Verify source exists
    source = queries.get_source(source_id, session_id)
    if not source:
        return JSONResponse(
            status_code=404,
            content={
                "error": "Source not found",
                "code": "source_not_found",
            },
        )

    try:
        return queries.get_drift_timeline(
            source_id, session_id,
            page=page, limit=limit,
            from_date=from_date, to_date=to_date,
        )
    except Exception as e:
        logger.error(f"Failed to get drift timeline for source {source_id}: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to retrieve drift timeline",
                "code": "get_drift_error",
            },
        )


# --- Individual scan endpoints ---

@router.get("/api/v1/scans/{scan_id}")
async def get_scan(request: Request, scan_id: str):
    """Get a single scan by ID."""
    session_id = request.state.session_id
    try:
        scan = queries.get_scan(scan_id, session_id)
        if not scan:
            return JSONResponse(
                status_code=404,
                content={
                    "error": "Scan not found",
                    "code": "scan_not_found",
                },
            )
        return scan
    except Exception as e:
        logger.error(f"Failed to get scan {scan_id}: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to retrieve scan",
                "code": "get_scan_error",
            },
        )


@router.delete("/api/v1/scans/{scan_id}")
async def delete_scan(request: Request, scan_id: str):
    """Delete a single scan and its associated drift events."""
    session_id = request.state.session_id
    try:
        deleted = queries.delete_scan(scan_id, session_id)
        if not deleted:
            return JSONResponse(
                status_code=404,
                content={
                    "error": "Scan not found",
                    "code": "scan_not_found",
                },
            )
        return JSONResponse(status_code=204, content=None)
    except Exception as e:
        logger.error(f"Failed to delete scan {scan_id}: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to delete scan",
                "code": "delete_scan_error",
            },
        )


@router.get("/api/v1/scans/{scan_id}/download")
async def download_scan(request: Request, scan_id: str):
    """Download the cleaned/original data from a scan as CSV.

    Returns CSV content with schema from the scan's schema_snapshot.
    """
    import csv
    import io
    from fastapi.responses import StreamingResponse

    session_id = request.state.session_id
    try:
        scan = queries.get_scan(scan_id, session_id)
        if not scan:
            return JSONResponse(
                status_code=404,
                content={
                    "error": "Scan not found",
                    "code": "scan_not_found",
                },
            )

        # Build CSV from schema snapshot
        schema = scan.get("schema_snapshot", {})
        columns = schema.get("columns", [])

        if not columns:
            return JSONResponse(
                status_code=404,
                content={
                    "error": "No schema data available for download",
                    "code": "no_schema_data",
                },
            )

        # Create a CSV with column headers and sample values
        output = io.StringIO()
        writer = csv.writer(output)

        # Header row
        headers = [c.get("name", f"column_{i}") for i, c in enumerate(columns)]
        writer.writerow(headers)

        # Write sample values as rows (transpose sample_values)
        max_samples = max(
            (len(c.get("sample_values", [])) for c in columns),
            default=0,
        )
        for row_idx in range(max_samples):
            row = []
            for col in columns:
                samples = col.get("sample_values", [])
                row.append(samples[row_idx] if row_idx < len(samples) else "")
            writer.writerow(row)

        output.seek(0)
        filename = scan.get("filename", "download.csv")
        if not filename.endswith(".csv"):
            filename = filename.rsplit(".", 1)[0] + ".csv" if "." in filename else filename + ".csv"

        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
            },
        )

    except Exception as e:
        logger.error(f"Failed to download scan {scan_id}: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to generate download",
                "code": "download_error",
            },
        )


@router.post("/api/v1/validate")
async def validate_schema(request: Request):
    """CI/CD validation endpoint (Pro only).

    Accepts a file upload and validates it against a known source's schema.
    Returns pass/fail with drift details.
    """
    session_id = request.state.session_id
    session = request.state.session

    # Pro-only check
    plan = session.get("plan", "free")
    if plan not in ("pro", "team"):
        return JSONResponse(
            status_code=403,
            content={
                "error": "The validate endpoint requires a Pro or Team plan.",
                "code": "plan_required",
                "details": {"required_plan": "pro", "current_plan": plan},
            },
        )

    try:
        body = await request.json()
    except Exception:
        return JSONResponse(
            status_code=400,
            content={
                "error": "Invalid JSON body. Expected: { source_id, schema }",
                "code": "invalid_json",
            },
        )

    source_id = body.get("source_id")
    incoming_schema = body.get("schema")

    if not source_id or not incoming_schema:
        return JSONResponse(
            status_code=400,
            content={
                "error": "source_id and schema are required",
                "code": "missing_fields",
            },
        )

    # Get the source
    source = queries.get_source(source_id, session_id)
    if not source:
        return JSONResponse(
            status_code=404,
            content={
                "error": "Source not found",
                "code": "source_not_found",
            },
        )

    baseline = source.get("baseline_schema", {})
    if not baseline:
        return JSONResponse(
            status_code=400,
            content={
                "error": "Source has no baseline schema to validate against",
                "code": "no_baseline",
            },
        )

    # Compare schemas
    baseline_cols = {c["name"] for c in baseline.get("columns", [])}
    incoming_cols = set(incoming_schema.get("columns", []) if isinstance(incoming_schema.get("columns"), list) and all(isinstance(c, str) for c in incoming_schema.get("columns", [])) else [c.get("name", "") for c in incoming_schema.get("columns", []) if isinstance(c, dict)])

    added = list(incoming_cols - baseline_cols)
    removed = list(baseline_cols - incoming_cols)

    passed = len(added) == 0 and len(removed) == 0

    return {
        "passed": passed,
        "source_id": source_id,
        "source_name": source.get("name", ""),
        "columns_added": added,
        "columns_removed": removed,
        "baseline_column_count": len(baseline_cols),
        "incoming_column_count": len(incoming_cols),
    }
