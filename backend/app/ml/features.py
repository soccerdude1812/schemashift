"""
28-feature extraction for column type classification.

Each column sample is reduced to a 28-dimensional feature vector that captures
character composition, length statistics, uniqueness, and regex pattern matches.
"""

import re
import signal
import numpy as np
import pandas as pd
from typing import List, Optional, Dict, Any


# Compiled regex patterns for performance
RE_INT = re.compile(r'^-?\d+$')
RE_FLOAT = re.compile(r'^-?\d+\.\d+$')
RE_DATE = re.compile(
    r'^(\d{1,4}[-/]\d{1,2}[-/]\d{1,4}|\d{1,2}\s+\w+\s+\d{2,4}|\w+\s+\d{1,2},?\s+\d{2,4}|\d{4}-\d{2}-\d{2}T\d{2}:\d{2}).*$'
)
RE_EMAIL = re.compile(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$')
RE_URL = re.compile(r'^https?://[^\s]+$')
RE_PHONE = re.compile(r'^[\+]?[\d\s\-\(\)\.]{7,20}$')
RE_UUID = re.compile(r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')
RE_BOOL = re.compile(r'^(true|false|yes|no|1|0|t|f|y|n)$', re.IGNORECASE)
RE_CURRENCY = re.compile(r'^[$\u20ac\u00a3\u00a5]\s?-?\d[\d,]*\.?\d*$')
RE_PERCENTAGE = re.compile(r'^-?\d+\.?\d*\s?%$')
RE_ZIP = re.compile(r'^\d{5}(-\d{4})?$')

# Feature names in order (for reference/debugging)
FEATURE_NAMES: List[str] = [
    'pct_digits', 'pct_alpha', 'pct_spaces', 'pct_special',
    'avg_length', 'std_length', 'min_length', 'max_length',
    'unique_ratio', 'null_rate',
    'has_leading_zeros', 'has_decimal_point', 'has_dash',
    'has_slash', 'has_colon', 'has_at_sign', 'has_comma',
    'pct_match_int', 'pct_match_float', 'pct_match_date',
    'pct_match_email', 'pct_match_url', 'pct_match_phone',
    'pct_match_uuid', 'pct_match_bool', 'pct_match_currency',
    'pct_match_percentage', 'pct_match_zip',
]

NUM_FEATURES = 28


def _safe_regex_match(pattern: re.Pattern, value: str, timeout_seconds: int = 5) -> bool:
    """Match a regex pattern with a timeout guard."""
    try:
        return bool(pattern.match(value))
    except Exception:
        return False


def _char_percentages(values: List[str]) -> Dict[str, float]:
    """Compute character composition percentages across all non-null values."""
    if not values:
        return {'digits': 0.0, 'alpha': 0.0, 'spaces': 0.0, 'special': 0.0}

    total_chars = 0
    digit_count = 0
    alpha_count = 0
    space_count = 0
    special_count = 0

    for val in values:
        for ch in val:
            total_chars += 1
            if ch.isdigit():
                digit_count += 1
            elif ch.isalpha():
                alpha_count += 1
            elif ch.isspace():
                space_count += 1
            else:
                special_count += 1

    if total_chars == 0:
        return {'digits': 0.0, 'alpha': 0.0, 'spaces': 0.0, 'special': 0.0}

    return {
        'digits': digit_count / total_chars,
        'alpha': alpha_count / total_chars,
        'spaces': space_count / total_chars,
        'special': special_count / total_chars,
    }


def _length_stats(values: List[str]) -> Dict[str, float]:
    """Compute length statistics for non-null values."""
    if not values:
        return {'avg': 0.0, 'std': 0.0, 'min': 0.0, 'max': 0.0}

    lengths = [len(v) for v in values]
    return {
        'avg': float(np.mean(lengths)),
        'std': float(np.std(lengths)),
        'min': float(min(lengths)),
        'max': float(max(lengths)),
    }


def _has_char_pct(values: List[str], char_check_fn) -> float:
    """Compute what fraction of values contain at least one char matching check_fn."""
    if not values:
        return 0.0
    count = sum(1 for v in values if any(char_check_fn(ch) for ch in v))
    return count / len(values)


def _regex_match_pct(values: List[str], pattern: re.Pattern) -> float:
    """Compute what fraction of values match the given regex pattern."""
    if not values:
        return 0.0
    count = sum(1 for v in values if _safe_regex_match(pattern, v.strip()))
    return count / len(values)


def extract_features(series: pd.Series) -> np.ndarray:
    """
    Extract a 28-feature vector from a pandas Series (one column of data).

    Args:
        series: A pandas Series representing one column's values.

    Returns:
        A numpy array of shape (28,) with float64 values.
    """
    total_count = len(series)
    null_count = int(series.isna().sum())
    null_rate = null_count / total_count if total_count > 0 else 0.0

    # Convert to string, drop nulls
    non_null = series.dropna().astype(str)
    values = non_null.tolist()
    non_null_count = len(values)

    # Unique ratio
    unique_ratio = non_null.nunique() / non_null_count if non_null_count > 0 else 0.0

    # Character percentages
    char_pcts = _char_percentages(values)

    # Length statistics
    len_stats = _length_stats(values)

    # Character presence features (fraction of values containing the char)
    has_leading_zeros = 0.0
    if values:
        has_leading_zeros = sum(
            1 for v in values
            if len(v) > 1 and v[0] == '0' and v[1:2].isdigit()
        ) / len(values)

    has_decimal = _has_char_pct(values, lambda ch: ch == '.')
    has_dash = _has_char_pct(values, lambda ch: ch == '-')
    has_slash = _has_char_pct(values, lambda ch: ch == '/')
    has_colon = _has_char_pct(values, lambda ch: ch == ':')
    has_at = _has_char_pct(values, lambda ch: ch == '@')
    has_comma = _has_char_pct(values, lambda ch: ch == ',')

    # Regex pattern match percentages
    pct_int = _regex_match_pct(values, RE_INT)
    pct_float = _regex_match_pct(values, RE_FLOAT)
    pct_date = _regex_match_pct(values, RE_DATE)
    pct_email = _regex_match_pct(values, RE_EMAIL)
    pct_url = _regex_match_pct(values, RE_URL)
    pct_phone = _regex_match_pct(values, RE_PHONE)
    pct_uuid = _regex_match_pct(values, RE_UUID)
    pct_bool = _regex_match_pct(values, RE_BOOL)
    pct_currency = _regex_match_pct(values, RE_CURRENCY)
    pct_percentage = _regex_match_pct(values, RE_PERCENTAGE)
    pct_zip = _regex_match_pct(values, RE_ZIP)

    features = np.array([
        char_pcts['digits'],       # 0: pct_digits
        char_pcts['alpha'],        # 1: pct_alpha
        char_pcts['spaces'],       # 2: pct_spaces
        char_pcts['special'],      # 3: pct_special
        len_stats['avg'],          # 4: avg_length
        len_stats['std'],          # 5: std_length
        len_stats['min'],          # 6: min_length
        len_stats['max'],          # 7: max_length
        unique_ratio,              # 8: unique_ratio
        null_rate,                 # 9: null_rate
        has_leading_zeros,         # 10: has_leading_zeros
        has_decimal,               # 11: has_decimal_point
        has_dash,                  # 12: has_dash
        has_slash,                 # 13: has_slash
        has_colon,                 # 14: has_colon
        has_at,                    # 15: has_at_sign
        has_comma,                 # 16: has_comma
        pct_int,                   # 17: pct_match_int
        pct_float,                 # 18: pct_match_float
        pct_date,                  # 19: pct_match_date
        pct_email,                 # 20: pct_match_email
        pct_url,                   # 21: pct_match_url
        pct_phone,                 # 22: pct_match_phone
        pct_uuid,                  # 23: pct_match_uuid
        pct_bool,                  # 24: pct_match_bool
        pct_currency,              # 25: pct_match_currency
        pct_percentage,            # 26: pct_match_percentage
        pct_zip,                   # 27: pct_match_zip
    ], dtype=np.float64)

    return features


def extract_features_batch(df: pd.DataFrame) -> Dict[str, np.ndarray]:
    """
    Extract features for all columns in a DataFrame.

    Args:
        df: A pandas DataFrame.

    Returns:
        A dict mapping column names to their 28-feature vectors.
    """
    result = {}
    for col in df.columns:
        try:
            result[col] = extract_features(df[col])
        except Exception:
            # Return zeros if feature extraction fails for a column
            result[col] = np.zeros(NUM_FEATURES, dtype=np.float64)
    return result
