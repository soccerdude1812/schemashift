"""
Stage 3: Column type classification using a trained Random Forest model.

Classifies each column into one of 14 semantic types:
  integer, float, boolean, date, datetime, email, url, phone,
  uuid, currency, percentage, zip_code, category, text

Falls back to rule-based classification if the ML model is unavailable.
"""

import os
import logging
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple

try:
    import joblib
    HAS_JOBLIB = True
except ImportError:
    HAS_JOBLIB = False

try:
    from app.ml.features import extract_features, FEATURE_NAMES, NUM_FEATURES
except ImportError:
    from backend.app.ml.features import extract_features, FEATURE_NAMES, NUM_FEATURES

logger = logging.getLogger(__name__)

# The 14 type classes
TYPE_CLASSES: List[str] = [
    'integer', 'float', 'boolean', 'date', 'datetime',
    'email', 'url', 'phone', 'uuid', 'currency',
    'percentage', 'zip_code', 'category', 'text',
]

# Path to the trained model
MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'type_classifier.joblib')
META_PATH = os.path.join(MODEL_DIR, 'type_classifier_meta.json')

# Singleton model cache
_model_cache: Optional[Any] = None
_label_encoder_cache: Optional[Any] = None


def _load_model() -> Tuple[Optional[Any], Optional[List[str]]]:
    """Load the trained model and label classes. Returns (model, classes) or (None, None)."""
    global _model_cache, _label_encoder_cache

    if _model_cache is not None:
        return _model_cache, _label_encoder_cache

    if not HAS_JOBLIB:
        logger.warning("joblib not installed, falling back to rule-based classification")
        return None, None

    if not os.path.exists(MODEL_PATH):
        logger.warning(f"Model file not found at {MODEL_PATH}, falling back to rule-based classification")
        return None, None

    try:
        model_data = joblib.load(MODEL_PATH)
        _model_cache = model_data['model']
        _label_encoder_cache = model_data['classes']
        logger.info(f"Loaded type classifier model with {len(_label_encoder_cache)} classes")
        return _model_cache, _label_encoder_cache
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        return None, None


def rule_based_classify(series: pd.Series) -> Dict[str, Any]:
    """
    Rule-based fallback classification for a single column.

    Uses regex match percentages and value patterns to determine type.

    Args:
        series: A pandas Series for one column.

    Returns:
        Dict with 'type', 'confidence', and 'method'.
    """
    features = extract_features(series)

    # Feature indices (from features.py)
    pct_int = features[17]
    pct_float = features[18]
    pct_date = features[19]
    pct_email = features[20]
    pct_url = features[21]
    pct_phone = features[22]
    pct_uuid = features[23]
    pct_bool = features[24]
    pct_currency = features[25]
    pct_percentage = features[26]
    pct_zip = features[27]
    unique_ratio = features[8]
    avg_length = features[4]
    has_leading_zeros = features[10]

    # Priority-ordered rules (more specific types first)
    threshold = 0.80

    if pct_uuid > threshold:
        return {'type': 'uuid', 'confidence': round(pct_uuid, 3), 'method': 'rule_based'}

    if pct_email > threshold:
        return {'type': 'email', 'confidence': round(pct_email, 3), 'method': 'rule_based'}

    if pct_url > threshold:
        return {'type': 'url', 'confidence': round(pct_url, 3), 'method': 'rule_based'}

    if pct_currency > threshold:
        return {'type': 'currency', 'confidence': round(pct_currency, 3), 'method': 'rule_based'}

    if pct_percentage > threshold:
        return {'type': 'percentage', 'confidence': round(pct_percentage, 3), 'method': 'rule_based'}

    if pct_bool > threshold:
        return {'type': 'boolean', 'confidence': round(pct_bool, 3), 'method': 'rule_based'}

    # Zip codes: match int but have leading zeros and fixed length
    if pct_zip > threshold and has_leading_zeros > 0.1:
        return {'type': 'zip_code', 'confidence': round(pct_zip, 3), 'method': 'rule_based'}

    if pct_phone > threshold:
        return {'type': 'phone', 'confidence': round(pct_phone, 3), 'method': 'rule_based'}

    if pct_date > threshold:
        # Distinguish date vs datetime
        has_colon = features[14]
        if has_colon > 0.5:
            return {'type': 'datetime', 'confidence': round(pct_date, 3), 'method': 'rule_based'}
        return {'type': 'date', 'confidence': round(pct_date, 3), 'method': 'rule_based'}

    if pct_float > threshold:
        return {'type': 'float', 'confidence': round(pct_float, 3), 'method': 'rule_based'}

    if pct_int > threshold:
        # Check for zip codes that look like integers
        if has_leading_zeros > 0.1 and 4 <= avg_length <= 10:
            return {'type': 'zip_code', 'confidence': 0.6, 'method': 'rule_based'}
        return {'type': 'integer', 'confidence': round(pct_int, 3), 'method': 'rule_based'}

    # Lower threshold checks
    if pct_date > 0.6:
        has_colon = features[14]
        if has_colon > 0.5:
            return {'type': 'datetime', 'confidence': round(pct_date, 3), 'method': 'rule_based'}
        return {'type': 'date', 'confidence': round(pct_date, 3), 'method': 'rule_based'}

    if pct_int > 0.6:
        return {'type': 'integer', 'confidence': round(pct_int, 3), 'method': 'rule_based'}

    if pct_float > 0.6:
        return {'type': 'float', 'confidence': round(pct_float, 3), 'method': 'rule_based'}

    # Category vs text: low cardinality = category, high = text
    if unique_ratio < 0.05 and avg_length < 50:
        return {'type': 'category', 'confidence': 0.7, 'method': 'rule_based'}

    if avg_length > 100:
        return {'type': 'text', 'confidence': 0.7, 'method': 'rule_based'}

    if unique_ratio < 0.2:
        return {'type': 'category', 'confidence': 0.6, 'method': 'rule_based'}

    return {'type': 'text', 'confidence': 0.5, 'method': 'rule_based'}


def ml_classify(series: pd.Series) -> Optional[Dict[str, Any]]:
    """
    ML-based classification using the trained Random Forest model.

    Args:
        series: A pandas Series for one column.

    Returns:
        Dict with 'type', 'confidence', 'method', and 'probabilities', or None if model unavailable.
    """
    model, classes = _load_model()
    if model is None or classes is None:
        return None

    try:
        features = extract_features(series).reshape(1, -1)
        prediction = model.predict(features)[0]
        probabilities = model.predict_proba(features)[0]

        # Map prediction index to class name
        pred_idx = list(classes).index(prediction) if prediction in classes else 0
        confidence = float(probabilities[pred_idx])

        # Build probability dict for top 3
        prob_pairs = list(zip(classes, probabilities.tolist()))
        prob_pairs.sort(key=lambda x: x[1], reverse=True)
        top_probs = {k: round(v, 3) for k, v in prob_pairs[:3]}

        return {
            'type': str(prediction),
            'confidence': round(confidence, 3),
            'method': 'ml_model',
            'top_probabilities': top_probs,
        }
    except Exception as e:
        logger.error(f"ML classification failed: {e}")
        return None


def classify_column(series: pd.Series) -> Dict[str, Any]:
    """
    Classify a single column, trying ML first with rule-based fallback.

    Args:
        series: A pandas Series for one column.

    Returns:
        Dict with 'type', 'confidence', 'method', and optionally 'top_probabilities'.
    """
    # Try ML classification first
    ml_result = ml_classify(series)
    if ml_result is not None and ml_result['confidence'] >= 0.5:
        return ml_result

    # Fall back to rule-based
    rule_result = rule_based_classify(series)

    # If ML gave a low-confidence result, use it as additional context
    if ml_result is not None:
        rule_result['ml_suggestion'] = ml_result['type']
        rule_result['ml_confidence'] = ml_result['confidence']

    return rule_result


def classify_all_columns(df: pd.DataFrame) -> Dict[str, Dict[str, Any]]:
    """
    Classify all columns in a DataFrame.

    Args:
        df: A pandas DataFrame.

    Returns:
        Dict mapping column names to classification results.
    """
    results: Dict[str, Dict[str, Any]] = {}
    for col in df.columns:
        try:
            results[str(col)] = classify_column(df[col])
        except Exception as e:
            logger.error(f"Classification failed for column '{col}': {e}")
            results[str(col)] = {
                'type': 'text',
                'confidence': 0.0,
                'method': 'fallback_error',
                'error': str(e),
            }
    return results
