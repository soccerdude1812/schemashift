"""Quality score computation for data sources.

Computes a 0-100 quality score based on:
- Completeness (null rate across columns)
- Consistency (type stability across scans)
- Freshness (time since last scan)
- Drift severity (recent drift events)
"""

from datetime import datetime, timezone
from typing import Any


def compute_quality_score(
    schema: dict[str, Any] | None = None,
    drift_events: list[dict[str, Any]] | None = None,
    scan_count: int = 0,
    last_scan_at: str | None = None,
) -> dict[str, Any]:
    """Compute a quality score (0-100) with breakdown.

    Args:
        schema: The current baseline schema with column metadata.
        drift_events: Recent drift events for this source.
        scan_count: Total number of scans for this source.
        last_scan_at: ISO timestamp of the last scan.

    Returns:
        Dict with keys: score, label, factors (dict of sub-scores),
        trend (up/down/stable)
    """
    factors: dict[str, float] = {}

    # Factor 1: Completeness (40 points max)
    # Based on average null rate across columns
    completeness_score = 40.0
    if schema and isinstance(schema, dict):
        columns = schema.get("columns", [])
        if columns:
            null_rates = []
            for col in columns:
                if isinstance(col, dict):
                    nr = col.get("null_rate", 0)
                    if isinstance(nr, (int, float)):
                        null_rates.append(nr)
            if null_rates:
                avg_null_rate = sum(null_rates) / len(null_rates)
                # 0% nulls = 40 points, 100% nulls = 0 points
                completeness_score = max(0, 40 * (1 - avg_null_rate))
    factors["completeness"] = round(completeness_score, 1)

    # Factor 2: Stability (30 points max)
    # Based on recent drift events (fewer = more stable)
    stability_score = 30.0
    if drift_events:
        recent_events = drift_events[:10]  # Most recent 10
        severity_map = {"critical": 10, "warning": 5, "info": 1}
        total_severity = sum(
            severity_map.get(e.get("severity", "info"), 1)
            for e in recent_events
        )
        # More severity = lower score
        stability_score = max(0, 30 - min(30, total_severity))
    factors["stability"] = round(stability_score, 1)

    # Factor 3: Freshness (15 points max)
    # Based on how recently the source was scanned
    freshness_score = 15.0
    if last_scan_at:
        try:
            last_scan = datetime.fromisoformat(last_scan_at.replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            hours_since = (now - last_scan).total_seconds() / 3600
            if hours_since > 168:  # > 1 week
                freshness_score = 5.0
            elif hours_since > 24:  # > 1 day
                freshness_score = 10.0
            else:
                freshness_score = 15.0
        except (ValueError, TypeError):
            freshness_score = 10.0
    elif scan_count == 0:
        freshness_score = 0.0
    factors["freshness"] = round(freshness_score, 1)

    # Factor 4: Coverage (15 points max)
    # Based on number of scans (more data = better baseline)
    if scan_count >= 10:
        coverage_score = 15.0
    elif scan_count >= 5:
        coverage_score = 12.0
    elif scan_count >= 3:
        coverage_score = 9.0
    elif scan_count >= 1:
        coverage_score = 5.0
    else:
        coverage_score = 0.0
    factors["coverage"] = round(coverage_score, 1)

    # Total score
    total = sum(factors.values())
    score = round(min(100, max(0, total)), 1)

    # Label
    if score >= 80:
        label = "Excellent"
    elif score >= 60:
        label = "Good"
    elif score >= 40:
        label = "Needs Attention"
    else:
        label = "Poor"

    # Trend (simplified: based on recent drift)
    trend = "stable"
    if drift_events and len(drift_events) > 0:
        recent_critical = sum(
            1 for e in drift_events[:5]
            if e.get("severity") == "critical"
        )
        if recent_critical >= 2:
            trend = "down"
        elif len(drift_events) > 5:
            older_critical = sum(
                1 for e in drift_events[5:10]
                if e.get("severity") == "critical"
            )
            if recent_critical < older_critical:
                trend = "up"

    return {
        "score": score,
        "label": label,
        "factors": factors,
        "trend": trend,
    }
