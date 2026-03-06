"""
Main ML pipeline orchestrator.

Runs all 7 stages sequentially:
1. Format detection
2. Schema extraction (sample first 10K rows)
3. Type classification
4. Fingerprinting + source matching
5. Drift detection (if known source)
6. Anomaly detection (if 3+ previous scans)
7. Recipe auto-application (if known source has recipes)

Each stage is wrapped in error handling -- if any stage fails,
the pipeline returns partial results with error info.
"""

import logging
import time
from typing import Dict, Any, List, Optional
import pandas as pd

try:
    from app.ml.format_detector import detect_format
    from app.ml.schema_extractor import parse_file_to_dataframe, extract_schema
    from app.ml.type_classifier import classify_all_columns
    from app.ml.fingerprinter import fingerprint_schema
    from app.ml.drift_detector import detect_drift
    from app.ml.anomaly_detector import detect_anomalies
    from app.ml.recipe_engine import apply_recipes
except ImportError:
    from backend.app.ml.format_detector import detect_format
    from backend.app.ml.schema_extractor import parse_file_to_dataframe, extract_schema
    from backend.app.ml.type_classifier import classify_all_columns
    from backend.app.ml.fingerprinter import fingerprint_schema
    from backend.app.ml.drift_detector import detect_drift
    from backend.app.ml.anomaly_detector import detect_anomalies
    from backend.app.ml.recipe_engine import apply_recipes

logger = logging.getLogger(__name__)


def compute_quality_score(
    schema: Dict[str, Any],
    type_classifications: Dict[str, Dict[str, Any]],
    drift_result: Optional[Dict[str, Any]],
    anomaly_result: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Compute an overall data quality score (0-100) based on multiple factors.

    Factors:
    - Completeness (null rates)
    - Type confidence (classification confidence)
    - Schema stability (drift score)
    - Statistical consistency (anomaly count)
    """
    scores: Dict[str, float] = {}

    # Completeness score (0-100): based on average null rate
    columns = schema.get('columns', [])
    if columns:
        avg_null_rate = sum(c.get('null_rate', 0.0) for c in columns) / len(columns)
        scores['completeness'] = max(0, 100 * (1 - avg_null_rate))
    else:
        scores['completeness'] = 100.0

    # Type confidence score (0-100)
    if type_classifications:
        avg_confidence = sum(
            c.get('confidence', 0.0) for c in type_classifications.values()
        ) / len(type_classifications)
        scores['type_confidence'] = round(avg_confidence * 100, 1)
    else:
        scores['type_confidence'] = 50.0

    # Stability score (0-100): inverse of drift score
    if drift_result and not drift_result.get('error'):
        drift_score = drift_result.get('drift_score', 0.0)
        scores['stability'] = max(0, 100 * (1 - drift_score))
    else:
        scores['stability'] = 100.0  # No drift info = assume stable

    # Consistency score (0-100): based on anomaly count
    if anomaly_result and not anomaly_result.get('insufficient_history', True):
        anomaly_count = anomaly_result.get('anomaly_count', 0)
        # Each anomaly reduces score by 10, floor at 0
        scores['consistency'] = max(0, 100 - anomaly_count * 10)
    else:
        scores['consistency'] = 100.0  # Insufficient data = assume consistent

    # Overall score: weighted average
    weights = {
        'completeness': 0.35,
        'type_confidence': 0.25,
        'stability': 0.25,
        'consistency': 0.15,
    }

    overall = sum(scores[k] * weights[k] for k in weights)

    # Grade label
    if overall >= 90:
        grade = 'Excellent'
    elif overall >= 75:
        grade = 'Good'
    elif overall >= 50:
        grade = 'Needs Attention'
    else:
        grade = 'Poor'

    return {
        'overall': round(overall, 1),
        'grade': grade,
        'breakdown': {k: round(v, 1) for k, v in scores.items()},
    }


async def run_pipeline(
    file_bytes: bytes,
    filename: str,
    file_size: int,
    session_id: str,
    known_sources: Optional[List[Dict[str, Any]]] = None,
    previous_scans: Optional[List[Dict[str, Any]]] = None,
    source_recipes: Optional[List[Dict[str, Any]]] = None,
    baseline_schema: Optional[Dict[str, Any]] = None,
    baseline_types: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """
    Run the complete 7-stage ML pipeline on uploaded file data.

    Args:
        file_bytes: Raw file content.
        filename: Original filename.
        file_size: File size in bytes.
        session_id: User session ID.
        known_sources: List of known source dicts for fingerprint matching.
        previous_scans: List of previous scan results for anomaly detection.
        source_recipes: List of recipe dicts to auto-apply.
        baseline_schema: Previous scan schema for drift comparison.
        baseline_types: Previous scan type classifications.

    Returns:
        Complete scan result dict with all stage outputs.
    """
    pipeline_start = time.time()
    stage_timings: Dict[str, float] = {}
    errors: List[Dict[str, str]] = []

    result: Dict[str, Any] = {
        'filename': filename,
        'file_size': file_size,
        'session_id': session_id,
        'format_info': None,
        'schema': None,
        'type_classifications': None,
        'fingerprint_result': None,
        'drift_result': None,
        'anomaly_result': None,
        'recipe_result': None,
        'quality_score': None,
        'stage_timings': stage_timings,
        'errors': errors,
        'cleaned_data': None,
    }

    # ---- Stage 1: Format Detection ----
    stage_start = time.time()
    try:
        format_info = detect_format(file_bytes, filename)
        result['format_info'] = format_info
        logger.info(f"Stage 1 complete: detected {format_info.get('file_type', 'unknown')} with "
                     f"{format_info.get('encoding', 'unknown')} encoding")
    except Exception as e:
        logger.error(f"Stage 1 (format detection) failed: {e}")
        errors.append({'stage': 'format_detection', 'error': str(e)})
        # Cannot continue without format detection
        result['stage_timings']['format_detection'] = round(time.time() - stage_start, 3)
        result['pipeline_duration'] = round(time.time() - pipeline_start, 3)
        return result
    stage_timings['format_detection'] = round(time.time() - stage_start, 3)

    # ---- Stage 2: Schema Extraction ----
    stage_start = time.time()
    df: Optional[pd.DataFrame] = None
    try:
        df = parse_file_to_dataframe(file_bytes, format_info)
        schema = extract_schema(df)
        result['schema'] = schema
        logger.info(f"Stage 2 complete: {schema['row_count']} rows, {schema['column_count']} columns")
    except Exception as e:
        logger.error(f"Stage 2 (schema extraction) failed: {e}")
        errors.append({'stage': 'schema_extraction', 'error': str(e)})
        result['stage_timings']['schema_extraction'] = round(time.time() - stage_start, 3)
        result['pipeline_duration'] = round(time.time() - pipeline_start, 3)
        return result
    stage_timings['schema_extraction'] = round(time.time() - stage_start, 3)

    # ---- Stage 3: Type Classification ----
    stage_start = time.time()
    type_classifications: Dict[str, Dict[str, Any]] = {}
    try:
        type_classifications = classify_all_columns(df)
        result['type_classifications'] = type_classifications
        logger.info(f"Stage 3 complete: classified {len(type_classifications)} columns")
    except Exception as e:
        logger.error(f"Stage 3 (type classification) failed: {e}")
        errors.append({'stage': 'type_classification', 'error': str(e)})
        # Continue with empty classifications
        result['type_classifications'] = {}
    stage_timings['type_classification'] = round(time.time() - stage_start, 3)

    # ---- Stage 4: Fingerprinting + Source Matching ----
    stage_start = time.time()
    try:
        column_types = {col: info.get('type', 'text') for col, info in type_classifications.items()}
        fingerprint_result = fingerprint_schema(
            column_types,
            known_sources or [],
        )
        result['fingerprint_result'] = fingerprint_result
        if fingerprint_result.get('matched_source'):
            match = fingerprint_result['matched_source']
            logger.info(f"Stage 4 complete: matched source '{match['name']}' "
                        f"(similarity: {match['similarity']})")
        else:
            logger.info("Stage 4 complete: new source detected")
    except Exception as e:
        logger.error(f"Stage 4 (fingerprinting) failed: {e}")
        errors.append({'stage': 'fingerprinting', 'error': str(e)})
        result['fingerprint_result'] = {
            'fingerprint': [],
            'matched_source': None,
            'is_new_source': True,
            'error': str(e),
        }
    stage_timings['fingerprinting'] = round(time.time() - stage_start, 3)

    # ---- Stage 5: Drift Detection ----
    stage_start = time.time()
    try:
        if baseline_schema and baseline_types:
            current_types = {col: info.get('type', 'text') for col, info in type_classifications.items()}
            drift_result = detect_drift(
                baseline_schema,
                schema,
                baseline_types,
                current_types,
            )
            result['drift_result'] = drift_result
            logger.info(f"Stage 5 complete: drift_score={drift_result.get('drift_score', 0)}, "
                        f"summary={drift_result.get('summary', 'N/A')}")
        else:
            result['drift_result'] = {
                'has_drift': False,
                'drift_score': 0.0,
                'summary': 'No baseline available for comparison',
                'added_columns': [],
                'removed_columns': [],
                'type_changes': [],
                'renamed_columns': [],
                'null_rate_shifts': [],
                'cardinality_changes': [],
            }
            logger.info("Stage 5 skipped: no baseline available")
    except Exception as e:
        logger.error(f"Stage 5 (drift detection) failed: {e}")
        errors.append({'stage': 'drift_detection', 'error': str(e)})
    stage_timings['drift_detection'] = round(time.time() - stage_start, 3)

    # ---- Stage 6: Anomaly Detection ----
    stage_start = time.time()
    try:
        if previous_scans and len(previous_scans) >= 3:
            anomaly_result = detect_anomalies(schema, previous_scans)
            result['anomaly_result'] = anomaly_result
            logger.info(f"Stage 6 complete: {anomaly_result.get('anomaly_count', 0)} anomalies detected")
        else:
            scan_count = len(previous_scans) if previous_scans else 0
            result['anomaly_result'] = {
                'has_anomalies': False,
                'anomaly_count': 0,
                'anomalies': [],
                'baseline_scans_used': scan_count,
                'insufficient_history': True,
            }
            logger.info(f"Stage 6 skipped: only {scan_count} previous scans (need 3+)")
    except Exception as e:
        logger.error(f"Stage 6 (anomaly detection) failed: {e}")
        errors.append({'stage': 'anomaly_detection', 'error': str(e)})
    stage_timings['anomaly_detection'] = round(time.time() - stage_start, 3)

    # ---- Stage 7: Recipe Auto-Application ----
    stage_start = time.time()
    try:
        if source_recipes and len(source_recipes) > 0 and df is not None:
            recipe_result = apply_recipes(df, source_recipes)
            cleaned_df = recipe_result.pop('df')

            # Convert cleaned data to list of dicts for storage
            # Limit to first 100 rows for preview
            preview_rows = min(100, len(cleaned_df))
            result['cleaned_data'] = cleaned_df.head(preview_rows).to_dict(orient='records')
            result['recipe_result'] = recipe_result
            logger.info(f"Stage 7 complete: applied {recipe_result['total_applied']} recipes, "
                        f"{recipe_result['total_failed']} failed")

            # Store the full cleaned DataFrame for download
            result['_cleaned_df'] = cleaned_df
        else:
            result['recipe_result'] = {
                'results': [],
                'total_applied': 0,
                'total_failed': 0,
                'rows_before': len(df) if df is not None else 0,
                'rows_after': len(df) if df is not None else 0,
            }
            logger.info("Stage 7 skipped: no recipes to apply")
    except Exception as e:
        logger.error(f"Stage 7 (recipe application) failed: {e}")
        errors.append({'stage': 'recipe_application', 'error': str(e)})
    stage_timings['recipe_application'] = round(time.time() - stage_start, 3)

    # ---- Compute Quality Score ----
    try:
        quality_score = compute_quality_score(
            schema,
            type_classifications,
            result.get('drift_result'),
            result.get('anomaly_result'),
        )
        result['quality_score'] = quality_score
    except Exception as e:
        logger.error(f"Quality score computation failed: {e}")
        result['quality_score'] = {'overall': 50.0, 'grade': 'Unknown', 'breakdown': {}}

    # Pipeline duration
    result['pipeline_duration'] = round(time.time() - pipeline_start, 3)

    # Store preview rows from original data (if no recipes were applied)
    if result.get('cleaned_data') is None and df is not None:
        preview_rows = min(100, len(df))
        result['cleaned_data'] = df.head(preview_rows).to_dict(orient='records')

    logger.info(f"Pipeline complete in {result['pipeline_duration']}s, "
                f"quality={result['quality_score'].get('overall', '?')}")

    return result
