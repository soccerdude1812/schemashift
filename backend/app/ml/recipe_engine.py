"""
Stage 7: Recipe engine for data transformations.

Applies a sequence of recipe operations to a DataFrame.
Supported operations:
  rename_column, drop_column, fill_null, convert_type, strip_whitespace,
  replace_value, parse_date, filter_rows, deduplicate, standardize_case,
  remove_leading_zeros, extract_pattern, custom_transform

All regex operations have a 5-second timeout to prevent ReDoS attacks.
"""

import re
import signal
import logging
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime

logger = logging.getLogger(__name__)

# Timeout for regex operations (seconds)
REGEX_TIMEOUT = 5


class RegexTimeoutError(Exception):
    """Raised when a regex operation exceeds the timeout."""
    pass


def _timeout_handler(signum, frame):
    """Signal handler for regex timeout."""
    raise RegexTimeoutError("Regex operation timed out after 5 seconds")


def _safe_regex_replace(series: pd.Series, pattern: str, replacement: str) -> pd.Series:
    """
    Apply regex replacement with a timeout guard.

    Falls back to returning the original series if the operation times out.
    """
    try:
        # Set alarm (only works on Unix)
        old_handler = signal.signal(signal.SIGALRM, _timeout_handler)
        signal.alarm(REGEX_TIMEOUT)
        try:
            result = series.astype(str).str.replace(pattern, replacement, regex=True)
            signal.alarm(0)  # Cancel alarm
            return result
        except RegexTimeoutError:
            logger.warning(f"Regex replace timed out for pattern: {pattern}")
            return series
        finally:
            signal.alarm(0)
            signal.signal(signal.SIGALRM, old_handler)
    except (OSError, AttributeError):
        # signal.alarm not available on this platform, run without timeout
        try:
            return series.astype(str).str.replace(pattern, replacement, regex=True)
        except Exception as e:
            logger.error(f"Regex replace failed: {e}")
            return series


def _safe_regex_extract(series: pd.Series, pattern: str) -> pd.Series:
    """
    Apply regex extraction with a timeout guard.
    """
    try:
        old_handler = signal.signal(signal.SIGALRM, _timeout_handler)
        signal.alarm(REGEX_TIMEOUT)
        try:
            result = series.astype(str).str.extract(pattern, expand=False)
            signal.alarm(0)
            return result
        except RegexTimeoutError:
            logger.warning(f"Regex extract timed out for pattern: {pattern}")
            return series
        finally:
            signal.alarm(0)
            signal.signal(signal.SIGALRM, old_handler)
    except (OSError, AttributeError):
        try:
            return series.astype(str).str.extract(pattern, expand=False)
        except Exception as e:
            logger.error(f"Regex extract failed: {e}")
            return series


def _safe_regex_filter(series: pd.Series, pattern: str) -> pd.Series:
    """
    Apply regex matching for row filtering with a timeout guard.
    Returns a boolean Series.
    """
    try:
        old_handler = signal.signal(signal.SIGALRM, _timeout_handler)
        signal.alarm(REGEX_TIMEOUT)
        try:
            result = series.astype(str).str.match(pattern)
            signal.alarm(0)
            return result
        except RegexTimeoutError:
            logger.warning(f"Regex filter timed out for pattern: {pattern}")
            return pd.Series([True] * len(series), index=series.index)
        finally:
            signal.alarm(0)
            signal.signal(signal.SIGALRM, old_handler)
    except (OSError, AttributeError):
        try:
            return series.astype(str).str.match(pattern)
        except Exception as e:
            logger.error(f"Regex filter failed: {e}")
            return pd.Series([True] * len(series), index=series.index)


# ---- Recipe Operation Implementations ----

def op_rename_column(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Rename a column. Params: old_name, new_name."""
    old_name = params.get('old_name', '')
    new_name = params.get('new_name', '')
    if old_name in df.columns and new_name:
        df = df.rename(columns={old_name: new_name})
    return df


def op_drop_column(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Drop a column. Params: column."""
    column = params.get('column', '')
    if column in df.columns:
        df = df.drop(columns=[column])
    return df


def op_fill_null(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Fill null values. Params: column, value, strategy (value|mean|median|mode|forward|backward)."""
    column = params.get('column', '')
    if column not in df.columns:
        return df

    strategy = params.get('strategy', 'value')
    fill_value = params.get('value', '')

    if strategy == 'mean':
        numeric = pd.to_numeric(df[column], errors='coerce')
        df[column] = df[column].fillna(str(numeric.mean()))
    elif strategy == 'median':
        numeric = pd.to_numeric(df[column], errors='coerce')
        df[column] = df[column].fillna(str(numeric.median()))
    elif strategy == 'mode':
        mode_val = df[column].mode()
        if len(mode_val) > 0:
            df[column] = df[column].fillna(mode_val.iloc[0])
    elif strategy == 'forward':
        df[column] = df[column].ffill()
    elif strategy == 'backward':
        df[column] = df[column].bfill()
    else:
        df[column] = df[column].fillna(fill_value)

    return df


def op_convert_type(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Convert column type. Params: column, target_type (int|float|str|bool|datetime)."""
    column = params.get('column', '')
    target_type = params.get('target_type', 'str')

    if column not in df.columns:
        return df

    try:
        if target_type == 'int':
            df[column] = pd.to_numeric(df[column], errors='coerce').astype('Int64')
        elif target_type == 'float':
            df[column] = pd.to_numeric(df[column], errors='coerce')
        elif target_type == 'bool':
            true_vals = {'true', 'yes', '1', 't', 'y'}
            df[column] = df[column].astype(str).str.lower().str.strip().isin(true_vals)
        elif target_type == 'datetime':
            df[column] = pd.to_datetime(df[column], errors='coerce', infer_datetime_format=True)
        else:
            df[column] = df[column].astype(str)
    except Exception as e:
        logger.warning(f"Type conversion failed for {column} -> {target_type}: {e}")

    return df


def op_strip_whitespace(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Strip whitespace from column values. Params: column (optional, all if omitted)."""
    column = params.get('column', '')
    if column:
        if column in df.columns:
            df[column] = df[column].astype(str).str.strip()
    else:
        for col in df.columns:
            if df[col].dtype == object:
                df[col] = df[col].astype(str).str.strip()
    return df


def op_replace_value(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Replace values in a column. Params: column, old_value, new_value, use_regex (bool)."""
    column = params.get('column', '')
    old_value = params.get('old_value', '')
    new_value = params.get('new_value', '')
    use_regex = params.get('use_regex', False)

    if column not in df.columns:
        return df

    if use_regex:
        df[column] = _safe_regex_replace(df[column], old_value, new_value)
    else:
        # Use vectorized comparison instead of df.replace which can be tricky
        mask = df[column].astype(str) == str(old_value)
        df.loc[mask, column] = new_value

    return df


def op_parse_date(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Parse date column with specified format. Params: column, format (optional)."""
    column = params.get('column', '')
    date_format = params.get('format', None)

    if column not in df.columns:
        return df

    try:
        if date_format:
            df[column] = pd.to_datetime(df[column], format=date_format, errors='coerce')
        else:
            df[column] = pd.to_datetime(df[column], errors='coerce', infer_datetime_format=True)
    except Exception as e:
        logger.warning(f"Date parsing failed for {column}: {e}")

    return df


def op_filter_rows(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """
    Filter rows based on a condition.
    Params: column, operator (eq|ne|gt|lt|gte|lte|contains|regex|not_null|is_null), value.
    NEVER uses df.query() or df.eval().
    """
    column = params.get('column', '')
    operator = params.get('operator', 'eq')
    value = params.get('value', '')

    if column not in df.columns:
        return df

    series = df[column]

    if operator == 'is_null':
        mask = series.isna()
    elif operator == 'not_null':
        mask = series.notna()
    elif operator == 'eq':
        mask = series.astype(str) == str(value)
    elif operator == 'ne':
        mask = series.astype(str) != str(value)
    elif operator in ('gt', 'lt', 'gte', 'lte'):
        numeric = pd.to_numeric(series, errors='coerce')
        try:
            compare_val = float(value)
        except (ValueError, TypeError):
            return df

        if operator == 'gt':
            mask = numeric > compare_val
        elif operator == 'lt':
            mask = numeric < compare_val
        elif operator == 'gte':
            mask = numeric >= compare_val
        else:
            mask = numeric <= compare_val
    elif operator == 'contains':
        mask = series.astype(str).str.contains(str(value), case=False, na=False, regex=False)
    elif operator == 'regex':
        mask = _safe_regex_filter(series, str(value))
    else:
        return df

    return df[mask].reset_index(drop=True)


def op_deduplicate(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Remove duplicate rows. Params: columns (list, optional), keep (first|last|none)."""
    columns = params.get('columns', None)
    keep = params.get('keep', 'first')

    if keep not in ('first', 'last', False):
        keep = 'first'
    if keep == 'none':
        keep = False

    if columns:
        valid_cols = [c for c in columns if c in df.columns]
        if valid_cols:
            df = df.drop_duplicates(subset=valid_cols, keep=keep).reset_index(drop=True)
    else:
        df = df.drop_duplicates(keep=keep).reset_index(drop=True)

    return df


def op_standardize_case(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Standardize string case. Params: column, case (lower|upper|title|capitalize)."""
    column = params.get('column', '')
    case = params.get('case', 'lower')

    if column not in df.columns:
        return df

    if case == 'lower':
        df[column] = df[column].astype(str).str.lower()
    elif case == 'upper':
        df[column] = df[column].astype(str).str.upper()
    elif case == 'title':
        df[column] = df[column].astype(str).str.title()
    elif case == 'capitalize':
        df[column] = df[column].astype(str).str.capitalize()

    return df


def op_remove_leading_zeros(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Remove leading zeros from a column. Params: column."""
    column = params.get('column', '')
    if column not in df.columns:
        return df

    df[column] = df[column].astype(str).str.lstrip('0')
    # Restore empty strings (was all zeros) back to '0'
    mask = df[column] == ''
    df.loc[mask, column] = '0'

    return df


def op_extract_pattern(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """Extract a regex pattern from a column into a new column. Params: column, pattern, new_column."""
    column = params.get('column', '')
    pattern = params.get('pattern', '')
    new_column = params.get('new_column', f'{column}_extracted')

    if column not in df.columns or not pattern:
        return df

    df[new_column] = _safe_regex_extract(df[column], pattern)
    return df


def op_custom_transform(df: pd.DataFrame, params: Dict[str, Any]) -> pd.DataFrame:
    """
    Apply a predefined custom transform. NOT arbitrary code execution.
    Params: column, transform (trim_and_lower|remove_non_numeric|extract_domain|normalize_phone).
    """
    column = params.get('column', '')
    transform = params.get('transform', '')

    if column not in df.columns:
        return df

    if transform == 'trim_and_lower':
        df[column] = df[column].astype(str).str.strip().str.lower()
    elif transform == 'remove_non_numeric':
        df[column] = df[column].astype(str).str.replace(r'[^\d.\-]', '', regex=True)
    elif transform == 'extract_domain':
        df[column] = df[column].astype(str).str.extract(r'@([\w.\-]+)', expand=False)
    elif transform == 'normalize_phone':
        df[column] = df[column].astype(str).str.replace(r'[\s\-\(\)\.]', '', regex=True)
    else:
        logger.warning(f"Unknown custom transform: {transform}")

    return df


# Operation registry
OPERATIONS: Dict[str, Callable[[pd.DataFrame, Dict[str, Any]], pd.DataFrame]] = {
    'rename_column': op_rename_column,
    'drop_column': op_drop_column,
    'fill_null': op_fill_null,
    'convert_type': op_convert_type,
    'strip_whitespace': op_strip_whitespace,
    'replace_value': op_replace_value,
    'parse_date': op_parse_date,
    'filter_rows': op_filter_rows,
    'deduplicate': op_deduplicate,
    'standardize_case': op_standardize_case,
    'remove_leading_zeros': op_remove_leading_zeros,
    'extract_pattern': op_extract_pattern,
    'custom_transform': op_custom_transform,
}


def apply_recipe(
    df: pd.DataFrame,
    recipe: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Apply a single recipe operation to a DataFrame.

    Args:
        df: Input DataFrame.
        recipe: Dict with 'operation' and 'params' keys.

    Returns:
        Dict with 'df' (transformed DataFrame), 'success' (bool),
        'rows_before', 'rows_after', and optional 'error'.
    """
    operation = recipe.get('operation', '')
    params = recipe.get('params', {})

    if operation not in OPERATIONS:
        return {
            'df': df,
            'success': False,
            'rows_before': len(df),
            'rows_after': len(df),
            'error': f"Unknown operation: {operation}",
        }

    rows_before = len(df)

    try:
        result_df = OPERATIONS[operation](df.copy(), params)
        return {
            'df': result_df,
            'success': True,
            'rows_before': rows_before,
            'rows_after': len(result_df),
        }
    except Exception as e:
        logger.error(f"Recipe operation '{operation}' failed: {e}")
        return {
            'df': df,
            'success': False,
            'rows_before': rows_before,
            'rows_after': rows_before,
            'error': str(e),
        }


def apply_recipes(
    df: pd.DataFrame,
    recipes: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Apply a sequence of recipe operations to a DataFrame.

    Args:
        df: Input DataFrame.
        recipes: Ordered list of recipe dicts, each with 'operation' and 'params'.

    Returns:
        Dict with:
        - df: final transformed DataFrame
        - results: list of per-recipe results
        - total_applied: int
        - total_failed: int
        - rows_before: int (original)
        - rows_after: int (final)
    """
    rows_before = len(df)
    results: List[Dict[str, Any]] = []
    current_df = df.copy()
    total_applied = 0
    total_failed = 0

    for i, recipe in enumerate(recipes):
        result = apply_recipe(current_df, recipe)

        recipe_result = {
            'index': i,
            'operation': recipe.get('operation', ''),
            'success': result['success'],
            'rows_before': result['rows_before'],
            'rows_after': result['rows_after'],
        }

        if result['success']:
            current_df = result['df']
            total_applied += 1
        else:
            recipe_result['error'] = result.get('error', 'Unknown error')
            total_failed += 1

        results.append(recipe_result)

    return {
        'df': current_df,
        'results': results,
        'total_applied': total_applied,
        'total_failed': total_failed,
        'rows_before': rows_before,
        'rows_after': len(current_df),
    }
