"""
Stage 4: MinHash fingerprinting for automatic source matching.

Creates a MinHash fingerprint from column_name:type pairs and compares
against known source fingerprints using Jaccard similarity.
Sources with similarity > 0.7 are considered the same data source.
"""

import logging
from datasketch import MinHash, MinHashLSH
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger(__name__)

# MinHash parameters
NUM_PERM = 128  # Number of permutations for MinHash
SIMILARITY_THRESHOLD = 0.7  # Jaccard similarity threshold for matching


def create_fingerprint(
    column_types: Dict[str, str],
    num_perm: int = NUM_PERM,
) -> MinHash:
    """
    Create a MinHash fingerprint from column_name:type pairs.

    Args:
        column_types: Dict mapping column names to their classified types.
        num_perm: Number of permutations for MinHash.

    Returns:
        A MinHash object.
    """
    mh = MinHash(num_perm=num_perm)

    for col_name, col_type in sorted(column_types.items()):
        # Encode column_name:type as a shingle
        shingle = f"{col_name.lower().strip()}:{col_type}"
        mh.update(shingle.encode('utf-8'))

    return mh


def fingerprint_to_list(mh: MinHash) -> List[int]:
    """
    Convert a MinHash to a serializable list of hash values.

    Args:
        mh: A MinHash object.

    Returns:
        List of integer hash values.
    """
    return [int(v) for v in mh.hashvalues]


def list_to_fingerprint(hash_values: List[int], num_perm: int = NUM_PERM) -> MinHash:
    """
    Reconstruct a MinHash from a list of hash values.

    Args:
        hash_values: List of integer hash values.
        num_perm: Number of permutations.

    Returns:
        A MinHash object.
    """
    mh = MinHash(num_perm=num_perm)
    for i, val in enumerate(hash_values):
        mh.hashvalues[i] = val
    return mh


def compute_similarity(mh1: MinHash, mh2: MinHash) -> float:
    """
    Compute Jaccard similarity between two MinHash fingerprints.

    Args:
        mh1: First MinHash.
        mh2: Second MinHash.

    Returns:
        Jaccard similarity score between 0.0 and 1.0.
    """
    return mh1.jaccard(mh2)


def find_matching_source(
    current_fingerprint: MinHash,
    known_sources: List[Dict[str, Any]],
    threshold: float = SIMILARITY_THRESHOLD,
) -> Optional[Dict[str, Any]]:
    """
    Find the best matching known source for the current file's fingerprint.

    Args:
        current_fingerprint: MinHash of the current file.
        known_sources: List of dicts with 'source_id', 'name', and 'fingerprint' (list of ints).
        threshold: Minimum Jaccard similarity to consider a match.

    Returns:
        Dict with 'source_id', 'name', 'similarity' if match found, None otherwise.
    """
    best_match: Optional[Dict[str, Any]] = None
    best_similarity = 0.0

    for source in known_sources:
        try:
            source_fp = source.get('fingerprint')
            if not source_fp:
                continue

            source_mh = list_to_fingerprint(source_fp)
            similarity = compute_similarity(current_fingerprint, source_mh)

            if similarity > best_similarity and similarity >= threshold:
                best_similarity = similarity
                best_match = {
                    'source_id': source['source_id'],
                    'name': source.get('name', 'Unknown'),
                    'similarity': round(similarity, 4),
                }
        except Exception as e:
            logger.warning(f"Error comparing fingerprint for source {source.get('source_id', '?')}: {e}")
            continue

    return best_match


def fingerprint_schema(
    column_types: Dict[str, str],
    known_sources: List[Dict[str, Any]],
    threshold: float = SIMILARITY_THRESHOLD,
) -> Dict[str, Any]:
    """
    Full Stage 4: Create fingerprint and find matching source.

    Args:
        column_types: Dict mapping column names to their classified types.
        known_sources: List of known source dicts with fingerprints.
        threshold: Matching threshold.

    Returns:
        Dict with:
        - fingerprint: list of int hash values
        - matched_source: dict with source_id, name, similarity (or None)
        - is_new_source: bool
    """
    try:
        fp = create_fingerprint(column_types)
        fp_list = fingerprint_to_list(fp)

        match = find_matching_source(fp, known_sources, threshold)

        return {
            'fingerprint': fp_list,
            'matched_source': match,
            'is_new_source': match is None,
        }
    except Exception as e:
        logger.error(f"Fingerprinting failed: {e}")
        return {
            'fingerprint': [],
            'matched_source': None,
            'is_new_source': True,
            'error': str(e),
        }
