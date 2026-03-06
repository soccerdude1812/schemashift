"""
Stage 2: Extract schema information from a parsed DataFrame.

Extracts column names, data types, null rates, cardinality,
sample values, and basic statistics for numeric columns.
"""

import io
import json
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional


MAX_SAMPLE_ROWS = 10_000
SAMPLE_VALUES_PER_COLUMN = 5


def parse_file_to_dataframe(
    raw_bytes: bytes,
    format_info: Dict[str, Any],
) -> pd.DataFrame:
    """
    Parse raw file bytes into a pandas DataFrame using detected format info.

    Args:
        raw_bytes: Raw file bytes.
        format_info: Output from format_detector.detect_format().

    Returns:
        A pandas DataFrame, potentially sampled to MAX_SAMPLE_ROWS.
    """
    encoding = format_info.get('encoding', 'utf-8')
    file_type = format_info.get('file_type', 'csv')

    try:
        text = raw_bytes.decode(encoding)
    except (UnicodeDecodeError, LookupError):
        text = raw_bytes.decode('utf-8', errors='replace')

    if file_type == 'json':
        try:
            data = json.loads(text)
            if isinstance(data, list):
                df = pd.DataFrame(data)
            elif isinstance(data, dict):
                # Try to find the main array in the dict
                for key, val in data.items():
                    if isinstance(val, list) and len(val) > 0 and isinstance(val[0], dict):
                        df = pd.DataFrame(val)
                        break
                else:
                    df = pd.DataFrame([data])
            else:
                df = pd.DataFrame([data])
        except (json.JSONDecodeError, ValueError) as e:
            raise ValueError(f"Failed to parse JSON: {e}")

    elif file_type == 'jsonl':
        lines = text.strip().split('\n')
        records = []
        for line in lines[:MAX_SAMPLE_ROWS]:
            line = line.strip()
            if line:
                try:
                    records.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
        if not records:
            raise ValueError("No valid JSONL records found")
        df = pd.DataFrame(records)

    else:
        # CSV / TSV
        delimiter = format_info.get('delimiter', ',')
        has_header = format_info.get('has_header', True)
        quote_char = format_info.get('quote_char', '"')

        df = pd.read_csv(
            io.StringIO(text),
            delimiter=delimiter,
            header=0 if has_header else None,
            quotechar=quote_char,
            on_bad_lines='skip',
            nrows=MAX_SAMPLE_ROWS,
            dtype=str,  # Read everything as string initially
            keep_default_na=True,
            na_values=['', 'NULL', 'null', 'None', 'none', 'NA', 'N/A', 'n/a', '#N/A', 'NaN', 'nan'],
        )

        # If no header was detected, generate column names
        if not has_header:
            df.columns = [f'column_{i}' for i in range(len(df.columns))]

    # Sample if too large
    if len(df) > MAX_SAMPLE_ROWS:
        df = df.head(MAX_SAMPLE_ROWS)

    return df


def _get_sample_values(series: pd.Series, n: int = SAMPLE_VALUES_PER_COLUMN) -> List[str]:
    """Get n representative non-null sample values from a series."""
    non_null = series.dropna()
    if len(non_null) == 0:
        return []

    # Get diverse samples: first, last, and random middle values
    samples = set()

    # Always include first non-null value
    samples.add(str(non_null.iloc[0]))

    # Include last non-null value
    if len(non_null) > 1:
        samples.add(str(non_null.iloc[-1]))

    # Add random samples to fill up to n
    if len(non_null) > 2:
        remaining = n - len(samples)
        if remaining > 0:
            indices = np.random.choice(len(non_null), size=min(remaining * 2, len(non_null)), replace=False)
            for idx in indices:
                samples.add(str(non_null.iloc[idx]))
                if len(samples) >= n:
                    break

    result = list(samples)[:n]
    # Truncate long values
    return [v[:200] if len(v) > 200 else v for v in result]


def _compute_numeric_stats(series: pd.Series) -> Optional[Dict[str, float]]:
    """Compute basic statistics for a numeric-looking column."""
    try:
        numeric = pd.to_numeric(series.dropna(), errors='coerce')
        valid = numeric.dropna()
        if len(valid) < 2:
            return None
        if len(valid) / max(len(series.dropna()), 1) < 0.5:
            # Less than 50% parseable as numeric -- not really numeric
            return None

        return {
            'mean': round(float(valid.mean()), 4),
            'std': round(float(valid.std()), 4),
            'min': round(float(valid.min()), 4),
            'max': round(float(valid.max()), 4),
            'q25': round(float(valid.quantile(0.25)), 4),
            'q50': round(float(valid.quantile(0.50)), 4),
            'q75': round(float(valid.quantile(0.75)), 4),
        }
    except (ValueError, TypeError):
        return None


def extract_schema(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Extract full schema information from a DataFrame.

    Args:
        df: A pandas DataFrame (already parsed and sampled).

    Returns:
        Dict with:
        - columns: list of column info dicts
        - row_count: number of rows in the sample
        - column_count: number of columns
    """
    columns_info: List[Dict[str, Any]] = []

    for col in df.columns:
        series = df[col]
        total = len(series)
        null_count = int(series.isna().sum())
        non_null_count = total - null_count
        null_rate = round(null_count / total, 4) if total > 0 else 0.0

        # Cardinality
        unique_count = int(series.dropna().nunique()) if non_null_count > 0 else 0
        cardinality = round(unique_count / non_null_count, 4) if non_null_count > 0 else 0.0

        # Pandas inferred dtype
        pandas_dtype = str(series.dtype)

        # Sample values
        sample_values = _get_sample_values(series)

        # Numeric stats (if applicable)
        numeric_stats = _compute_numeric_stats(series)

        col_info: Dict[str, Any] = {
            'name': str(col),
            'pandas_dtype': pandas_dtype,
            'null_count': null_count,
            'non_null_count': non_null_count,
            'null_rate': null_rate,
            'unique_count': unique_count,
            'cardinality': cardinality,
            'sample_values': sample_values,
        }

        if numeric_stats is not None:
            col_info['numeric_stats'] = numeric_stats

        columns_info.append(col_info)

    return {
        'columns': columns_info,
        'row_count': len(df),
        'column_count': len(df.columns),
    }
