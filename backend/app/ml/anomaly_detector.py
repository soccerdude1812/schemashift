"""
Stage 6: Statistical anomaly detection across scan history.

Uses z-score analysis on column-level statistics (null_rate, cardinality, mean, std)
to flag columns whose current values deviate significantly from historical norms.
Requires at least 3 previous scans to compute meaningful baselines.
"""

import logging
import numpy as np
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

# Z-score threshold for flagging anomalies
Z_SCORE_THRESHOLD = 2.0
MIN_SCANS_FOR_BASELINE = 3

# Metrics to track for anomaly detection
TRACKED_METRICS = ['null_rate', 'cardinality', 'unique_count']
NUMERIC_METRICS = ['mean', 'std', 'min', 'max']


def _compute_z_score(value: float, mean: float, std: float) -> float:
    """Compute z-score, returning 0 if std is 0."""
    if std == 0 or np.isnan(std):
        return 0.0
    return (value - mean) / std


def build_baseline(
    historical_scans: List[Dict[str, Any]],
) -> Dict[str, Dict[str, Dict[str, float]]]:
    """
    Build a statistical baseline from historical scan data.

    Args:
        historical_scans: List of previous scan results, each containing
            a 'schema' key with 'columns' list.

    Returns:
        Dict mapping column_name -> metric_name -> {mean, std, count}
    """
    # Collect metric values per column per metric
    column_metrics: Dict[str, Dict[str, List[float]]] = {}

    for scan in historical_scans:
        schema = scan.get('schema', {})
        columns = schema.get('columns', [])

        for col_info in columns:
            col_name = col_info.get('name', '')
            if not col_name:
                continue

            if col_name not in column_metrics:
                column_metrics[col_name] = {m: [] for m in TRACKED_METRICS + NUMERIC_METRICS}

            # Standard metrics
            for metric in TRACKED_METRICS:
                val = col_info.get(metric)
                if val is not None:
                    try:
                        column_metrics[col_name][metric].append(float(val))
                    except (ValueError, TypeError):
                        pass

            # Numeric stats (nested under numeric_stats)
            numeric_stats = col_info.get('numeric_stats', {})
            if numeric_stats:
                for metric in NUMERIC_METRICS:
                    val = numeric_stats.get(metric)
                    if val is not None:
                        try:
                            column_metrics[col_name][metric].append(float(val))
                        except (ValueError, TypeError):
                            pass

    # Compute mean and std for each metric
    baseline: Dict[str, Dict[str, Dict[str, float]]] = {}
    for col_name, metrics in column_metrics.items():
        baseline[col_name] = {}
        for metric_name, values in metrics.items():
            if len(values) >= MIN_SCANS_FOR_BASELINE:
                arr = np.array(values, dtype=np.float64)
                baseline[col_name][metric_name] = {
                    'mean': float(np.mean(arr)),
                    'std': float(np.std(arr)),
                    'count': len(values),
                }

    return baseline


def detect_anomalies(
    current_schema: Dict[str, Any],
    historical_scans: List[Dict[str, Any]],
    z_threshold: float = Z_SCORE_THRESHOLD,
) -> Dict[str, Any]:
    """
    Full Stage 6: Detect statistical anomalies in the current scan.

    Args:
        current_schema: Schema info from the current scan.
        historical_scans: List of previous scan results.
        z_threshold: Z-score threshold for flagging.

    Returns:
        Dict with:
        - has_anomalies: bool
        - anomaly_count: int
        - anomalies: list of anomaly dicts
        - baseline_scans_used: int
        - insufficient_history: bool (True if < 3 historical scans)
    """
    result: Dict[str, Any] = {
        'has_anomalies': False,
        'anomaly_count': 0,
        'anomalies': [],
        'baseline_scans_used': len(historical_scans),
        'insufficient_history': len(historical_scans) < MIN_SCANS_FOR_BASELINE,
    }

    if len(historical_scans) < MIN_SCANS_FOR_BASELINE:
        return result

    try:
        baseline = build_baseline(historical_scans)
        anomalies: List[Dict[str, Any]] = []

        for col_info in current_schema.get('columns', []):
            col_name = col_info.get('name', '')
            if col_name not in baseline:
                continue

            col_baseline = baseline[col_name]

            # Check standard metrics
            for metric in TRACKED_METRICS:
                if metric not in col_baseline:
                    continue

                current_val = col_info.get(metric)
                if current_val is None:
                    continue

                try:
                    current_val = float(current_val)
                except (ValueError, TypeError):
                    continue

                baseline_stats = col_baseline[metric]
                z_score = _compute_z_score(
                    current_val,
                    baseline_stats['mean'],
                    baseline_stats['std'],
                )

                if abs(z_score) > z_threshold:
                    anomalies.append({
                        'column': col_name,
                        'metric': metric,
                        'current_value': round(current_val, 4),
                        'baseline_mean': round(baseline_stats['mean'], 4),
                        'baseline_std': round(baseline_stats['std'], 4),
                        'z_score': round(z_score, 2),
                        'direction': 'above' if z_score > 0 else 'below',
                        'severity': 'high' if abs(z_score) > 3.0 else 'medium',
                    })

            # Check numeric stats
            numeric_stats = col_info.get('numeric_stats', {})
            if numeric_stats:
                for metric in NUMERIC_METRICS:
                    if metric not in col_baseline:
                        continue

                    current_val = numeric_stats.get(metric)
                    if current_val is None:
                        continue

                    try:
                        current_val = float(current_val)
                    except (ValueError, TypeError):
                        continue

                    baseline_stats = col_baseline[metric]
                    z_score = _compute_z_score(
                        current_val,
                        baseline_stats['mean'],
                        baseline_stats['std'],
                    )

                    if abs(z_score) > z_threshold:
                        anomalies.append({
                            'column': col_name,
                            'metric': f'numeric_{metric}',
                            'current_value': round(current_val, 4),
                            'baseline_mean': round(baseline_stats['mean'], 4),
                            'baseline_std': round(baseline_stats['std'], 4),
                            'z_score': round(z_score, 2),
                            'direction': 'above' if z_score > 0 else 'below',
                            'severity': 'high' if abs(z_score) > 3.0 else 'medium',
                        })

        # Sort by severity (high first) then z-score magnitude
        anomalies.sort(key=lambda a: (-1 if a['severity'] == 'high' else 0, -abs(a['z_score'])))

        result['anomalies'] = anomalies
        result['anomaly_count'] = len(anomalies)
        result['has_anomalies'] = len(anomalies) > 0

    except Exception as e:
        logger.error(f"Anomaly detection failed: {e}")
        result['error'] = str(e)

    return result
