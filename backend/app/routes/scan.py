"""Scan endpoint: file upload + ML pipeline execution.

Accepts multipart file upload, runs the ML pipeline (or mock fallback),
matches or creates a source, creates scan record, and returns results.
"""

import asyncio
import hashlib
import logging
import time
from typing import Any

from fastapi import APIRouter, File, Request, UploadFile
from fastapi.responses import JSONResponse

from app.config import (
    FREE_MAX_FILE_SIZE,
    PRO_MAX_FILE_SIZE,
    PIPELINE_TIMEOUT_SECONDS,
)
from app.db import queries
from app.utils.file_parser import (
    ALLOWED_EXTENSIONS,
    get_file_extension,
    parse_file,
    sanitize_filename,
)
from app.utils.quality_scorer import compute_quality_score
from app.utils.rate_limiter import scan_limiter, global_scan_limiter

logger = logging.getLogger(__name__)
router = APIRouter(tags=["scan"])


def _try_import_pipeline():
    """Try to import the ML pipeline. Returns None if not available."""
    try:
        from app.ml.pipeline import run_pipeline
        return run_pipeline
    except (ImportError, ModuleNotFoundError, Exception) as e:
        logger.info(f"ML pipeline not available, using mock: {e}")
        return None


def _mock_pipeline(df, format_info: dict, existing_source: dict | None = None) -> dict[str, Any]:
    """Mock pipeline result when ML pipeline isn't ready.

    Generates realistic-looking schema analysis from the DataFrame.
    """
    columns = []
    for col in df.columns:
        series = df[col]
        null_rate = float(series.isna().mean())
        cardinality = float(series.nunique() / max(len(series), 1))
        sample_vals = [str(v) for v in series.dropna().head(5).tolist()]

        # Simple type inference
        dtype_str = str(series.dtype)
        if "int" in dtype_str:
            semantic_type = "numeric"
        elif "float" in dtype_str:
            semantic_type = "numeric"
        elif "datetime" in dtype_str:
            semantic_type = "date"
        else:
            non_null = series.dropna()
            if len(non_null) > 0:
                sample = str(non_null.iloc[0]).lower()
                if "@" in sample and "." in sample:
                    semantic_type = "email"
                elif sample.startswith("http"):
                    semantic_type = "url"
                elif col.lower() in ("id", "uuid", "key"):
                    semantic_type = "identifier"
                else:
                    semantic_type = "string"
            else:
                semantic_type = "string"

        columns.append({
            "name": col,
            "dtype": dtype_str,
            "semantic_type": semantic_type,
            "null_rate": round(null_rate, 4),
            "cardinality": round(cardinality, 4),
            "sample_values": sample_vals[:5],
        })

    schema = {"columns": columns}

    # Generate fingerprint from sorted column names
    col_sig = ",".join(sorted(c["name"] for c in columns))
    fingerprint = hashlib.md5(col_sig.encode()).hexdigest()[:16]

    # Drift detection against existing source
    drift_summary = None
    if existing_source and existing_source.get("baseline_schema"):
        baseline = existing_source["baseline_schema"]
        baseline_cols = {c["name"] for c in baseline.get("columns", [])}
        current_cols = {c["name"] for c in columns}

        added = list(current_cols - baseline_cols)
        removed = list(baseline_cols - current_cols)

        type_changes = []
        for bc in baseline.get("columns", []):
            for cc in columns:
                if bc["name"] == cc["name"] and bc.get("semantic_type") != cc.get("semantic_type"):
                    type_changes.append({
                        "column": bc["name"],
                        "from": bc.get("semantic_type"),
                        "to": cc.get("semantic_type"),
                    })

        null_changes = []
        for bc in baseline.get("columns", []):
            for cc in columns:
                if bc["name"] == cc["name"]:
                    diff = abs(cc.get("null_rate", 0) - bc.get("null_rate", 0))
                    if diff > 0.1:
                        null_changes.append({
                            "column": bc["name"],
                            "from": bc.get("null_rate", 0),
                            "to": cc.get("null_rate", 0),
                        })

        total_changes = len(added) + len(removed) + len(type_changes) + len(null_changes)
        if total_changes > 0:
            drift_summary = {
                "total_changes": total_changes,
                "columns_added": added,
                "columns_removed": removed,
                "type_changes": type_changes,
                "null_rate_changes": null_changes,
            }

    return {
        "schema": schema,
        "fingerprint": fingerprint,
        "drift_summary": drift_summary,
        "anomalies": None,
        "recipes_applied": None,
    }


def _convert_real_pipeline_result(result: dict[str, Any]) -> dict[str, Any]:
    """Convert the real ML pipeline result dict to the format our scan route expects.

    The real pipeline returns keys like 'schema', 'type_classifications',
    'fingerprint_result', 'drift_result', etc. We normalize to our API format.
    """
    schema = result.get("schema", {})
    fp_result = result.get("fingerprint_result", {})
    drift_result = result.get("drift_result", {})
    anomaly_result = result.get("anomaly_result", {})

    # Build fingerprint string from the fingerprint_result
    fingerprint_list = fp_result.get("fingerprint", [])
    if fingerprint_list:
        fingerprint = hashlib.md5(str(fingerprint_list).encode()).hexdigest()[:16]
    else:
        # Fallback: hash column names
        cols = schema.get("columns", [])
        col_sig = ",".join(sorted(c.get("name", "") for c in cols))
        fingerprint = hashlib.md5(col_sig.encode()).hexdigest()[:16]

    # Build drift_summary from drift_result
    drift_summary = None
    if drift_result and drift_result.get("has_drift", False):
        added = drift_result.get("added_columns", [])
        removed = drift_result.get("removed_columns", [])
        type_changes = drift_result.get("type_changes", [])
        null_changes = drift_result.get("null_rate_shifts", [])
        renamed = drift_result.get("renamed_columns", [])

        total = len(added) + len(removed) + len(type_changes) + len(null_changes) + len(renamed)
        if total > 0:
            drift_summary = {
                "total_changes": total,
                "columns_added": [c.get("column", c) if isinstance(c, dict) else c for c in added],
                "columns_removed": [c.get("column", c) if isinstance(c, dict) else c for c in removed],
                "type_changes": type_changes,
                "null_rate_changes": null_changes,
            }

    # Merge type classifications into schema columns
    type_classifications = result.get("type_classifications", {})
    if type_classifications and schema.get("columns"):
        for col_info in schema["columns"]:
            col_name = col_info.get("name", "")
            if col_name in type_classifications:
                tc = type_classifications[col_name]
                col_info["semantic_type"] = tc.get("type", col_info.get("semantic_type", "string"))

    return {
        "schema": schema,
        "fingerprint": fingerprint,
        "drift_summary": drift_summary,
        "anomalies": anomaly_result if anomaly_result and not anomaly_result.get("insufficient_history", True) else None,
        "recipes_applied": result.get("recipe_result"),
    }


@router.post("/api/v1/scan")
async def create_scan(request: Request, file: UploadFile = File(...)):
    """Upload a file and run schema analysis.

    Accepts CSV, TSV, JSON, JSONL files (max 10MB free, 50MB pro).
    Returns scan result with schema, drift detection, and quality score.
    """
    session_id = request.state.session_id
    session = request.state.session

    # Rate limit checks
    if not global_scan_limiter.allow("global"):
        return JSONResponse(
            status_code=429,
            content={
                "error": "System is at capacity. Please try again in a few minutes.",
                "code": "global_rate_limit",
            },
        )

    if not scan_limiter.allow(session_id):
        return JSONResponse(
            status_code=429,
            content={
                "error": "Too many scans. Please wait before scanning again.",
                "code": "scan_rate_limit",
            },
        )

    # Validate file extension
    if not file.filename:
        return JSONResponse(
            status_code=400,
            content={
                "error": "No filename provided",
                "code": "missing_filename",
            },
        )

    ext = get_file_extension(file.filename)
    if ext not in ALLOWED_EXTENSIONS:
        return JSONResponse(
            status_code=400,
            content={
                "error": f"Unsupported file format: '{ext}'. Supported: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
                "code": "unsupported_format",
            },
        )

    # Read file content
    try:
        content = await file.read()
    except Exception as e:
        logger.error(f"Failed to read uploaded file: {e}")
        return JSONResponse(
            status_code=400,
            content={
                "error": "Failed to read uploaded file",
                "code": "file_read_error",
            },
        )

    # Validate file size
    plan = session.get("plan", "free")
    max_size = PRO_MAX_FILE_SIZE if plan == "pro" else FREE_MAX_FILE_SIZE
    if len(content) > max_size:
        max_mb = max_size / (1024 * 1024)
        return JSONResponse(
            status_code=413,
            content={
                "error": f"File too large. Maximum size is {max_mb:.0f}MB for {plan} plan.",
                "code": "file_too_large",
                "details": {
                    "size_bytes": len(content),
                    "max_bytes": max_size,
                    "plan": plan,
                },
            },
        )

    # Validate not empty
    if len(content) == 0:
        return JSONResponse(
            status_code=400,
            content={
                "error": "Uploaded file is empty",
                "code": "empty_file",
            },
        )

    safe_filename = sanitize_filename(file.filename)

    # Try the real ML pipeline first, fall back to mock
    pipeline_fn = _try_import_pipeline()
    use_real_pipeline = pipeline_fn is not None

    if use_real_pipeline:
        # Real pipeline: pass raw bytes and let it handle parsing
        try:
            # Gather context for the pipeline
            sources_resp = queries.get_sources(session_id, page=1, limit=100)
            known_sources = []
            for s in sources_resp.get("data", []):
                known_sources.append({
                    "name": s.get("name", ""),
                    "fingerprint": s.get("fingerprint"),
                    "id": s.get("id"),
                })

            # Find potential matching source
            existing_source = None
            baseline_schema = None
            baseline_types = None
            previous_scans_data = None
            source_recipes = None

            # We'll run pipeline and see if it matches a source
            raw_result = await asyncio.wait_for(
                pipeline_fn(
                    file_bytes=content,
                    filename=safe_filename,
                    file_size=len(content),
                    session_id=session_id,
                    known_sources=known_sources,
                    previous_scans=previous_scans_data,
                    source_recipes=source_recipes,
                    baseline_schema=baseline_schema,
                    baseline_types=baseline_types,
                ),
                timeout=PIPELINE_TIMEOUT_SECONDS,
            )

            pipeline_result = _convert_real_pipeline_result(raw_result)

        except asyncio.TimeoutError:
            return JSONResponse(
                status_code=408,
                content={
                    "error": "Analysis is taking longer than expected. Please try again with a smaller file.",
                    "code": "pipeline_timeout",
                    "details": {"timeout_seconds": PIPELINE_TIMEOUT_SECONDS},
                },
            )
        except Exception as e:
            logger.warning(f"Real pipeline failed, falling back to mock: {e}", exc_info=True)
            use_real_pipeline = False

    if not use_real_pipeline:
        # Mock pipeline: parse file ourselves, then run mock analysis
        try:
            df, format_info = parse_file(content, safe_filename)
        except ValueError as e:
            return JSONResponse(
                status_code=400,
                content={
                    "error": str(e),
                    "code": "parse_error",
                },
            )
        except Exception as e:
            logger.error(f"Unexpected parse error: {e}")
            return JSONResponse(
                status_code=400,
                content={
                    "error": "Failed to parse file. Please check the format.",
                    "code": "parse_error",
                },
            )

        if df.empty:
            return JSONResponse(
                status_code=400,
                content={
                    "error": "File contains no data rows",
                    "code": "empty_data",
                },
            )

        # Find existing source by fingerprint
        existing_source = None
        col_sig = ",".join(sorted(df.columns.tolist()))
        fp = hashlib.md5(col_sig.encode()).hexdigest()[:16]
        existing_source = queries.find_source_by_fingerprint(session_id, fp)

        pipeline_result = _mock_pipeline(df, format_info, existing_source)
        # Ensure format_info is captured
        if "format_info" not in pipeline_result:
            pipeline_result["format_info"] = format_info

    # Extract results
    schema = pipeline_result.get("schema", {})
    fingerprint = pipeline_result.get("fingerprint")
    drift_summary = pipeline_result.get("drift_summary")
    anomalies = pipeline_result.get("anomalies")
    recipes_applied = pipeline_result.get("recipes_applied")

    # Determine format_info
    if use_real_pipeline:
        format_info = pipeline_result.get("format_info") or {
            "format": ext.lstrip(".") if ext else "unknown",
            "encoding": "utf-8",
            "file_size_bytes": len(content),
            "original_filename": safe_filename,
            "row_count": len(schema.get("columns", [])),
            "column_count": len(schema.get("columns", [])),
        }
    else:
        format_info = pipeline_result.get("format_info", {})

    # Match or create source
    try:
        existing_source = None
        is_baseline = False

        if fingerprint:
            existing_source = queries.find_source_by_fingerprint(session_id, fingerprint)

        if existing_source:
            source = existing_source
            new_scan_count = (source.get("scan_count") or 0) + 1
            from datetime import datetime, timezone
            queries.update_source(source["id"], session_id, {
                "baseline_schema": schema,
                "format_info": format_info,
                "column_count": len(schema.get("columns", [])),
                "scan_count": new_scan_count,
                "last_scanned_at": datetime.now(timezone.utc).isoformat(),
            })
        else:
            is_baseline = True
            source_name = safe_filename.rsplit(".", 1)[0] if "." in safe_filename else safe_filename
            source = queries.create_source(
                session_id=session_id,
                name=source_name,
                fingerprint=fingerprint,
                baseline_schema=schema,
                format_info=format_info,
                column_count=len(schema.get("columns", [])),
            )
            queries.increment_source_count(session_id)
            drift_summary = None

        # Compute quality score
        drift_events = []
        if not is_baseline:
            timeline = queries.get_drift_timeline(source["id"], session_id, page=1, limit=10)
            drift_events = timeline.get("data", [])

        from datetime import datetime, timezone
        quality = compute_quality_score(
            schema=schema,
            drift_events=drift_events,
            scan_count=(source.get("scan_count") or 0) + (1 if is_baseline else 0),
            last_scan_at=datetime.now(timezone.utc).isoformat(),
        )

        # Create scan record
        scan = queries.create_scan({
            "session_id": session_id,
            "source_id": source["id"],
            "filename": safe_filename,
            "file_size_bytes": len(content),
            "format_info": format_info,
            "schema_snapshot": schema,
            "drift_summary": drift_summary,
            "anomalies": anomalies,
            "quality_score": quality,
            "recipes_applied": recipes_applied,
            "row_count": format_info.get("row_count", 0),
            "column_count": format_info.get("column_count", len(schema.get("columns", []))),
            "is_baseline": is_baseline,
        })

        # Create drift events if drift detected
        if drift_summary and drift_summary.get("total_changes", 0) > 0:
            events_to_create = []

            for col_name in drift_summary.get("columns_added", []):
                events_to_create.append({
                    "source_id": source["id"],
                    "scan_id": scan["id"],
                    "session_id": session_id,
                    "event_type": "column_added",
                    "severity": "warning",
                    "column_name": col_name,
                    "details": {"message": f"New column '{col_name}' detected"},
                })

            for col_name in drift_summary.get("columns_removed", []):
                events_to_create.append({
                    "source_id": source["id"],
                    "scan_id": scan["id"],
                    "session_id": session_id,
                    "event_type": "column_removed",
                    "severity": "critical",
                    "column_name": col_name,
                    "details": {"message": f"Column '{col_name}' is missing"},
                })

            for tc in drift_summary.get("type_changes", []):
                events_to_create.append({
                    "source_id": source["id"],
                    "scan_id": scan["id"],
                    "session_id": session_id,
                    "event_type": "type_change",
                    "severity": "warning",
                    "column_name": tc.get("column"),
                    "details": {
                        "from": tc.get("from"),
                        "to": tc.get("to"),
                        "message": f"Column '{tc.get('column')}' type changed from {tc.get('from')} to {tc.get('to')}",
                    },
                })

            for nc in drift_summary.get("null_rate_changes", []):
                severity = "critical" if abs(nc.get("to", 0) - nc.get("from", 0)) > 0.3 else "warning"
                events_to_create.append({
                    "source_id": source["id"],
                    "scan_id": scan["id"],
                    "session_id": session_id,
                    "event_type": "null_rate_spike",
                    "severity": severity,
                    "column_name": nc.get("column"),
                    "details": {
                        "from": nc.get("from"),
                        "to": nc.get("to"),
                        "message": f"Null rate for '{nc.get('column')}' changed from {nc.get('from', 0):.0%} to {nc.get('to', 0):.0%}",
                    },
                })

            if events_to_create:
                queries.create_drift_events(events_to_create)

        # Increment scan count on session
        queries.increment_scan_count(session_id)

        # Build response
        return JSONResponse(
            status_code=201,
            content={
                "scan": scan,
                "source": {
                    "id": source["id"],
                    "name": source.get("name", ""),
                    "is_new": is_baseline,
                    "scan_count": (source.get("scan_count") or 0) + (1 if is_baseline else 0),
                },
                "drift_summary": drift_summary,
                "quality_score": quality,
                "is_baseline": is_baseline,
            },
        )

    except Exception as e:
        logger.error(f"Failed to save scan results: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to save scan results. Please try again.",
                "code": "save_error",
            },
        )
