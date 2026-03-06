"""
Stage 5: Schema drift detection.

Compares the current scan's schema against a baseline (previous scan or source profile).
Detects:
- Added columns
- Removed columns
- Type changes
- Renamed columns (using TF-IDF + cosine similarity on column names)
- Null rate shifts
- Cardinality changes
"""

import logging
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

# Thresholds
RENAME_SIMILARITY_THRESHOLD = 0.6  # Cosine similarity for column name matching
NULL_RATE_SHIFT_THRESHOLD = 0.1  # Absolute change in null_rate to flag
CARDINALITY_SHIFT_THRESHOLD = 0.2  # Relative change in cardinality to flag


def _tokenize_column_name(name: str) -> List[str]:
    """
    Tokenize a column name into meaningful parts for TF-IDF comparison.
    Handles snake_case, camelCase, kebab-case, and space-separated names.
    """
    import re
    # Split on underscores, hyphens, spaces
    parts = re.split(r'[_\-\s]+', name)
    # Also split camelCase
    expanded = []
    for part in parts:
        # Insert space before uppercase letters in camelCase
        camel_split = re.sub(r'([a-z])([A-Z])', r'\1 \2', part)
        expanded.extend(camel_split.lower().split())
    return expanded


def _compute_name_similarity_matrix(
    names_a: List[str],
    names_b: List[str],
) -> np.ndarray:
    """
    Compute a similarity matrix between two sets of column names using TF-IDF + cosine similarity.

    Returns matrix of shape (len(names_a), len(names_b)).
    """
    if not names_a or not names_b:
        return np.array([]).reshape(0, 0)

    # Create tokenized representations
    all_names = names_a + names_b

    # Use character n-grams for better matching of similar names
    try:
        vectorizer = TfidfVectorizer(
            analyzer='char_wb',
            ngram_range=(2, 4),
            lowercase=True,
        )
        tfidf_matrix = vectorizer.fit_transform(all_names)

        sim_matrix = cosine_similarity(
            tfidf_matrix[:len(names_a)],
            tfidf_matrix[len(names_a):],
        )
        return sim_matrix
    except ValueError:
        # If TF-IDF fails (e.g., all empty strings), return zeros
        return np.zeros((len(names_a), len(names_b)))


def detect_renamed_columns(
    removed: List[str],
    added: List[str],
    baseline_columns: Dict[str, Dict[str, Any]],
    current_columns: Dict[str, Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Among removed and added columns, detect potential renames using name similarity
    and statistical similarity (null_rate, type).

    Args:
        removed: Column names present in baseline but not in current.
        added: Column names present in current but not in baseline.
        baseline_columns: Dict of baseline column info keyed by name.
        current_columns: Dict of current column info keyed by name.

    Returns:
        List of rename candidates, each a dict with:
        - old_name, new_name, name_similarity, type_match, null_rate_similar, confidence
    """
    if not removed or not added:
        return []

    # Compute name similarity
    sim_matrix = _compute_name_similarity_matrix(removed, added)
    if sim_matrix.size == 0:
        return []

    renames: List[Dict[str, Any]] = []
    used_added: set = set()

    # Greedy matching: pick the best match for each removed column
    for i, old_name in enumerate(removed):
        best_j = -1
        best_score = 0.0

        for j, new_name in enumerate(added):
            if j in used_added:
                continue

            name_sim = float(sim_matrix[i, j])
            if name_sim < RENAME_SIMILARITY_THRESHOLD:
                continue

            # Bonus for matching type
            old_type = baseline_columns.get(old_name, {}).get('type', '')
            new_type = current_columns.get(new_name, {}).get('type', '')
            type_match = old_type == new_type

            # Bonus for similar null rate
            old_null_rate = baseline_columns.get(old_name, {}).get('null_rate', 0.0)
            new_null_rate = current_columns.get(new_name, {}).get('null_rate', 0.0)
            null_similar = abs(old_null_rate - new_null_rate) < NULL_RATE_SHIFT_THRESHOLD

            # Combined score
            score = name_sim
            if type_match:
                score += 0.15
            if null_similar:
                score += 0.1

            if score > best_score:
                best_score = score
                best_j = j

        if best_j >= 0 and best_score >= RENAME_SIMILARITY_THRESHOLD:
            new_name = added[best_j]
            used_added.add(best_j)

            old_type = baseline_columns.get(old_name, {}).get('type', '')
            new_type = current_columns.get(new_name, {}).get('type', '')
            old_null_rate = baseline_columns.get(old_name, {}).get('null_rate', 0.0)
            new_null_rate = current_columns.get(new_name, {}).get('null_rate', 0.0)

            renames.append({
                'old_name': old_name,
                'new_name': new_name,
                'name_similarity': round(float(sim_matrix[i, best_j]), 3),
                'type_match': old_type == new_type,
                'null_rate_similar': abs(old_null_rate - new_null_rate) < NULL_RATE_SHIFT_THRESHOLD,
                'confidence': round(best_score, 3),
            })

    return renames


def detect_drift(
    baseline_schema: Dict[str, Any],
    current_schema: Dict[str, Any],
    baseline_types: Dict[str, str],
    current_types: Dict[str, str],
) -> Dict[str, Any]:
    """
    Full Stage 5: Compare current schema against baseline and detect all drift types.

    Args:
        baseline_schema: Schema info from a previous scan (output of schema_extractor).
        current_schema: Schema info from the current scan.
        baseline_types: Dict mapping column names to types from baseline.
        current_types: Dict mapping column names to types from current scan.

    Returns:
        Dict with:
        - has_drift: bool
        - drift_score: float (0-1, severity)
        - added_columns: list of added column names
        - removed_columns: list of removed column names
        - type_changes: list of {column, old_type, new_type}
        - renamed_columns: list of {old_name, new_name, confidence}
        - null_rate_shifts: list of {column, old_rate, new_rate, delta}
        - cardinality_changes: list of {column, old_cardinality, new_cardinality}
        - summary: human-readable summary string
    """
    try:
        # Build column info dicts
        baseline_cols_by_name: Dict[str, Dict[str, Any]] = {}
        for col in baseline_schema.get('columns', []):
            baseline_cols_by_name[col['name']] = col

        current_cols_by_name: Dict[str, Dict[str, Any]] = {}
        for col in current_schema.get('columns', []):
            current_cols_by_name[col['name']] = col

        baseline_names = set(baseline_cols_by_name.keys())
        current_names = set(current_cols_by_name.keys())

        # Detect added and removed columns
        added_columns = sorted(current_names - baseline_names)
        removed_columns = sorted(baseline_names - current_names)

        # Detect renamed columns among added/removed
        # Add type info to column dicts for rename detection
        baseline_with_types = {}
        for name, info in baseline_cols_by_name.items():
            baseline_with_types[name] = {**info, 'type': baseline_types.get(name, 'text')}
        current_with_types = {}
        for name, info in current_cols_by_name.items():
            current_with_types[name] = {**info, 'type': current_types.get(name, 'text')}

        renamed_columns = detect_renamed_columns(
            removed_columns, added_columns,
            baseline_with_types, current_with_types,
        )

        # Remove renamed columns from added/removed lists
        renamed_old = {r['old_name'] for r in renamed_columns}
        renamed_new = {r['new_name'] for r in renamed_columns}
        added_columns = [c for c in added_columns if c not in renamed_new]
        removed_columns = [c for c in removed_columns if c not in renamed_old]

        # Detect type changes (for columns present in both)
        common_columns = baseline_names & current_names
        type_changes: List[Dict[str, str]] = []
        for col in sorted(common_columns):
            old_type = baseline_types.get(col, 'text')
            new_type = current_types.get(col, 'text')
            if old_type != new_type:
                type_changes.append({
                    'column': col,
                    'old_type': old_type,
                    'new_type': new_type,
                })

        # Detect null rate shifts
        null_rate_shifts: List[Dict[str, Any]] = []
        for col in sorted(common_columns):
            old_rate = baseline_cols_by_name[col].get('null_rate', 0.0)
            new_rate = current_cols_by_name[col].get('null_rate', 0.0)
            delta = new_rate - old_rate
            if abs(delta) >= NULL_RATE_SHIFT_THRESHOLD:
                null_rate_shifts.append({
                    'column': col,
                    'old_rate': round(old_rate, 4),
                    'new_rate': round(new_rate, 4),
                    'delta': round(delta, 4),
                })

        # Detect cardinality changes
        cardinality_changes: List[Dict[str, Any]] = []
        for col in sorted(common_columns):
            old_card = baseline_cols_by_name[col].get('cardinality', 0.0)
            new_card = current_cols_by_name[col].get('cardinality', 0.0)
            if old_card > 0:
                relative_change = abs(new_card - old_card) / old_card
                if relative_change >= CARDINALITY_SHIFT_THRESHOLD:
                    cardinality_changes.append({
                        'column': col,
                        'old_cardinality': round(old_card, 4),
                        'new_cardinality': round(new_card, 4),
                        'relative_change': round(relative_change, 4),
                    })

        # Compute drift score (0-1)
        has_drift = bool(
            added_columns or removed_columns or type_changes
            or renamed_columns or null_rate_shifts or cardinality_changes
        )

        total_baseline_cols = max(len(baseline_names), 1)
        drift_score = 0.0
        # Column structure changes are heavy
        drift_score += len(added_columns) * 0.15
        drift_score += len(removed_columns) * 0.2
        drift_score += len(type_changes) * 0.15
        drift_score += len(renamed_columns) * 0.05  # Renames are lighter
        drift_score += len(null_rate_shifts) * 0.05
        drift_score += len(cardinality_changes) * 0.03
        # Normalize by column count
        drift_score = min(drift_score / total_baseline_cols, 1.0)

        # Build summary
        parts: List[str] = []
        if added_columns:
            parts.append(f"{len(added_columns)} column(s) added")
        if removed_columns:
            parts.append(f"{len(removed_columns)} column(s) removed")
        if type_changes:
            parts.append(f"{len(type_changes)} type change(s)")
        if renamed_columns:
            parts.append(f"{len(renamed_columns)} potential rename(s)")
        if null_rate_shifts:
            parts.append(f"{len(null_rate_shifts)} null rate shift(s)")
        if cardinality_changes:
            parts.append(f"{len(cardinality_changes)} cardinality change(s)")

        summary = "; ".join(parts) if parts else "No drift detected"

        return {
            'has_drift': has_drift,
            'drift_score': round(drift_score, 4),
            'added_columns': added_columns,
            'removed_columns': removed_columns,
            'type_changes': type_changes,
            'renamed_columns': renamed_columns,
            'null_rate_shifts': null_rate_shifts,
            'cardinality_changes': cardinality_changes,
            'summary': summary,
        }

    except Exception as e:
        logger.error(f"Drift detection failed: {e}")
        return {
            'has_drift': False,
            'drift_score': 0.0,
            'added_columns': [],
            'removed_columns': [],
            'type_changes': [],
            'renamed_columns': [],
            'null_rate_shifts': [],
            'cardinality_changes': [],
            'summary': f"Drift detection error: {e}",
            'error': str(e),
        }
