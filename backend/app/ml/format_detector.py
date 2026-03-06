"""
Stage 1: Auto-detect file format parameters.

Detects encoding, delimiter, header row, quote character, and line ending
from raw file bytes. Uses chardet for encoding detection on the first 100KB.
"""

import csv
import io
import chardet
from typing import Optional, Dict, Any, Tuple


# Supported delimiters in order of preference
CANDIDATE_DELIMITERS = [',', ';', '\t', '|']

# Supported quote characters
CANDIDATE_QUOTES = ['"', "'"]


def detect_encoding(raw_bytes: bytes, sample_size: int = 102400) -> Dict[str, Any]:
    """
    Detect file encoding using chardet on first 100KB.

    Args:
        raw_bytes: Raw file bytes.
        sample_size: Number of bytes to sample (default 100KB).

    Returns:
        Dict with 'encoding', 'confidence', and 'language' keys.
    """
    sample = raw_bytes[:sample_size]
    result = chardet.detect(sample)

    encoding = result.get('encoding', 'utf-8') or 'utf-8'
    confidence = result.get('confidence', 0.0) or 0.0

    # Normalize common encoding aliases
    encoding_lower = encoding.lower().replace('-', '')
    if encoding_lower in ('ascii', 'usascii'):
        encoding = 'utf-8'  # ASCII is a subset of UTF-8
    elif encoding_lower in ('iso88591', 'latin1', 'windows1252', 'cp1252'):
        # Keep as-is but normalize name
        if encoding_lower in ('windows1252', 'cp1252'):
            encoding = 'cp1252'
        else:
            encoding = 'latin-1'

    return {
        'encoding': encoding,
        'confidence': round(confidence, 3),
        'language': result.get('language', ''),
    }


def detect_line_ending(text: str) -> str:
    """
    Detect the predominant line ending style.

    Args:
        text: Decoded text content.

    Returns:
        One of '\\r\\n', '\\r', or '\\n'.
    """
    crlf_count = text.count('\r\n')
    cr_count = text.count('\r') - crlf_count  # Standalone \r
    lf_count = text.count('\n') - crlf_count  # Standalone \n

    if crlf_count >= lf_count and crlf_count >= cr_count:
        return '\r\n'
    elif cr_count >= lf_count:
        return '\r'
    return '\n'


def _score_delimiter(text: str, delimiter: str) -> Tuple[float, int]:
    """
    Score a delimiter candidate based on consistency across rows.

    Returns (consistency_score, avg_fields_per_row).
    Higher consistency = more likely the correct delimiter.
    """
    lines = text.strip().split('\n')[:50]  # Sample first 50 lines
    if len(lines) < 2:
        return (0.0, 0)

    field_counts = []
    for line in lines:
        if line.strip():
            # Simple count -- doesn't handle quoted fields perfectly
            # but good enough for scoring
            count = line.count(delimiter) + 1
            field_counts.append(count)

    if not field_counts:
        return (0.0, 0)

    # If all rows have 1 field, this delimiter isn't present
    if max(field_counts) <= 1:
        return (0.0, 1)

    # Consistency: how many rows have the same field count as the majority
    from collections import Counter
    counter = Counter(field_counts)
    most_common_count, most_common_freq = counter.most_common(1)[0]

    consistency = most_common_freq / len(field_counts)
    return (consistency, most_common_count)


def detect_delimiter(text: str) -> Dict[str, Any]:
    """
    Auto-detect the best delimiter from candidate set.

    Args:
        text: Decoded text content.

    Returns:
        Dict with 'delimiter', 'confidence', and 'fields_per_row'.
    """
    best_delim = ','
    best_score = 0.0
    best_fields = 0

    for delim in CANDIDATE_DELIMITERS:
        score, fields = _score_delimiter(text, delim)
        # Prefer delimiters that produce more fields (but at least 2)
        if fields >= 2:
            adjusted_score = score * (1 + min(fields, 20) / 20.0)
        else:
            adjusted_score = 0.0

        if adjusted_score > best_score:
            best_score = adjusted_score
            best_delim = delim
            best_fields = fields

    # Also try csv.Sniffer as a cross-check
    try:
        sample = '\n'.join(text.strip().split('\n')[:20])
        dialect = csv.Sniffer().sniff(sample, delimiters=''.join(CANDIDATE_DELIMITERS))
        sniffer_delim = dialect.delimiter
        sniffer_score, sniffer_fields = _score_delimiter(text, sniffer_delim)
        if sniffer_score > best_score and sniffer_fields >= 2:
            best_delim = sniffer_delim
            best_score = sniffer_score
            best_fields = sniffer_fields
    except csv.Error:
        pass

    return {
        'delimiter': best_delim,
        'confidence': round(min(best_score, 1.0), 3),
        'fields_per_row': best_fields,
    }


def detect_header(text: str, delimiter: str) -> Dict[str, Any]:
    """
    Detect whether the first row is a header row.

    Heuristic: headers tend to be all strings, while data rows contain
    numbers, dates, etc. Also checks if first row values are unique and
    look like column names.

    Args:
        text: Decoded text content.
        delimiter: The detected delimiter.

    Returns:
        Dict with 'has_header' (bool) and 'confidence'.
    """
    lines = text.strip().split('\n')
    if len(lines) < 2:
        return {'has_header': True, 'confidence': 0.5}

    # Use csv.Sniffer
    try:
        sample = '\n'.join(lines[:20])
        has_header = csv.Sniffer().has_header(sample)
        if has_header:
            return {'has_header': True, 'confidence': 0.85}
    except csv.Error:
        pass

    # Manual heuristic: check if first row values are unique, all-string,
    # and look like identifiers
    reader = csv.reader(io.StringIO('\n'.join(lines[:10])), delimiter=delimiter)
    rows = list(reader)
    if len(rows) < 2:
        return {'has_header': True, 'confidence': 0.5}

    first_row = rows[0]
    data_rows = rows[1:]

    # Check if first row values look like column names
    name_like_count = 0
    for val in first_row:
        val = val.strip()
        # Column names are typically short, alphanumeric with underscores/spaces
        if val and len(val) < 50 and not val.replace(' ', '').replace('_', '').replace('-', '').isdigit():
            name_like_count += 1

    # Check if first row values are all unique
    unique_in_first = len(set(v.strip().lower() for v in first_row)) == len(first_row)

    # Check if data rows have numeric values where first row doesn't
    data_has_numbers = False
    for row in data_rows[:5]:
        for val in row:
            try:
                float(val.strip())
                data_has_numbers = True
                break
            except (ValueError, AttributeError):
                continue
        if data_has_numbers:
            break

    confidence = 0.5
    if name_like_count == len(first_row):
        confidence += 0.2
    if unique_in_first:
        confidence += 0.15
    if data_has_numbers:
        confidence += 0.15

    return {
        'has_header': confidence > 0.65,
        'confidence': round(min(confidence, 1.0), 3),
    }


def detect_quote_char(text: str) -> Optional[str]:
    """Detect the quote character used in the file."""
    double_count = text.count('"')
    single_count = text.count("'")

    if double_count > 0 and double_count > single_count:
        return '"'
    elif single_count > 0:
        return "'"
    return '"'  # Default to double quote


def detect_format(raw_bytes: bytes, filename: str = "") -> Dict[str, Any]:
    """
    Full Stage 1: Detect all format parameters from raw file bytes.

    Args:
        raw_bytes: Raw file content.
        filename: Original filename (used for format hints).

    Returns:
        Dict with all detected format parameters:
        - encoding, encoding_confidence
        - file_type ('csv', 'tsv', 'json', 'jsonl')
        - delimiter, delimiter_confidence, fields_per_row
        - has_header, header_confidence
        - quote_char
        - line_ending
        - row_count_estimate
    """
    result: Dict[str, Any] = {
        'encoding': 'utf-8',
        'encoding_confidence': 1.0,
        'file_type': 'csv',
        'delimiter': ',',
        'delimiter_confidence': 1.0,
        'fields_per_row': 0,
        'has_header': True,
        'header_confidence': 0.5,
        'quote_char': '"',
        'line_ending': '\n',
        'row_count_estimate': 0,
    }

    try:
        # Step 1: Detect encoding
        enc_info = detect_encoding(raw_bytes)
        result['encoding'] = enc_info['encoding']
        result['encoding_confidence'] = enc_info['confidence']

        # Step 2: Decode text
        try:
            text = raw_bytes.decode(enc_info['encoding'])
        except (UnicodeDecodeError, LookupError):
            text = raw_bytes.decode('utf-8', errors='replace')
            result['encoding'] = 'utf-8'
            result['encoding_confidence'] = 0.5

        # Step 3: Detect file type from filename and content
        filename_lower = filename.lower()
        if filename_lower.endswith('.json'):
            stripped = text.strip()
            if stripped.startswith('{') or stripped.startswith('['):
                result['file_type'] = 'json'
                result['delimiter'] = ''
                result['has_header'] = False
                # Estimate rows for JSON
                if stripped.startswith('['):
                    result['row_count_estimate'] = stripped.count('{')
                else:
                    result['row_count_estimate'] = 1
                return result

        if filename_lower.endswith('.jsonl') or filename_lower.endswith('.ndjson'):
            result['file_type'] = 'jsonl'
            result['delimiter'] = ''
            result['has_header'] = False
            result['row_count_estimate'] = text.count('\n')
            return result

        # Check if content looks like JSON even without extension
        stripped = text.strip()
        if stripped.startswith('[') and stripped.endswith(']'):
            try:
                import json
                json.loads(stripped[:10000])  # Quick validity check
                result['file_type'] = 'json'
                result['delimiter'] = ''
                result['has_header'] = False
                result['row_count_estimate'] = stripped.count('{')
                return result
            except (json.JSONDecodeError, ValueError):
                pass

        # Step 4: CSV/TSV detection
        if filename_lower.endswith('.tsv'):
            result['file_type'] = 'tsv'

        # Detect line ending
        result['line_ending'] = detect_line_ending(text)

        # Detect delimiter
        delim_info = detect_delimiter(text)
        result['delimiter'] = delim_info['delimiter']
        result['delimiter_confidence'] = delim_info['confidence']
        result['fields_per_row'] = delim_info['fields_per_row']

        if delim_info['delimiter'] == '\t':
            result['file_type'] = 'tsv'

        # Detect header
        header_info = detect_header(text, result['delimiter'])
        result['has_header'] = header_info['has_header']
        result['header_confidence'] = header_info['confidence']

        # Detect quote char
        result['quote_char'] = detect_quote_char(text)

        # Estimate row count
        line_count = text.count('\n')
        if result['has_header']:
            result['row_count_estimate'] = max(0, line_count - 1)
        else:
            result['row_count_estimate'] = line_count

    except Exception as e:
        result['error'] = str(e)

    return result
