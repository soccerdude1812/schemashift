"""File parsing utilities for CSV, TSV, JSON, and JSONL formats."""

import csv
import io
import json
import re
from typing import Any

import chardet
import pandas as pd


ALLOWED_EXTENSIONS = {".csv", ".tsv", ".json", ".jsonl"}
SAFE_FILENAME_RE = re.compile(r"[^a-zA-Z0-9._-]")


def sanitize_filename(filename: str) -> str:
    """Sanitize a filename by stripping path separators and special chars."""
    # Remove path separators
    filename = filename.replace("/", "").replace("\\", "").replace("..", "")
    # Keep only alphanumeric, dots, hyphens, underscores
    name_parts = filename.rsplit(".", 1)
    if len(name_parts) == 2:
        base, ext = name_parts
        base = SAFE_FILENAME_RE.sub("_", base)[:100]
        ext = SAFE_FILENAME_RE.sub("", ext)[:10]
        return f"{base}.{ext}"
    return SAFE_FILENAME_RE.sub("_", filename)[:100]


def get_file_extension(filename: str) -> str:
    """Extract and validate file extension."""
    if "." not in filename:
        return ""
    ext = "." + filename.rsplit(".", 1)[-1].lower()
    return ext


def detect_encoding(content_bytes: bytes) -> str:
    """Detect file encoding using chardet on first 100KB."""
    sample = content_bytes[:102400]
    result = chardet.detect(sample)
    encoding = result.get("encoding", "utf-8") or "utf-8"
    return encoding


def parse_csv(content_bytes: bytes, delimiter: str = ",") -> pd.DataFrame:
    """Parse CSV/TSV bytes into a DataFrame."""
    encoding = detect_encoding(content_bytes)
    text = content_bytes.decode(encoding, errors="replace")
    df = pd.read_csv(
        io.StringIO(text),
        delimiter=delimiter,
        dtype=str,
        keep_default_na=True,
        on_bad_lines="warn",
        engine="python",
    )
    return df


def parse_json(content_bytes: bytes) -> pd.DataFrame:
    """Parse JSON bytes into a DataFrame.

    Supports:
    - Array of objects: [{"a": 1}, {"a": 2}]
    - Single object: {"a": 1} -> single-row DF
    """
    encoding = detect_encoding(content_bytes)
    text = content_bytes.decode(encoding, errors="replace")
    data = json.loads(text)

    if isinstance(data, list):
        if len(data) == 0:
            return pd.DataFrame()
        if isinstance(data[0], dict):
            return pd.DataFrame(data).astype(str)
        raise ValueError("JSON array must contain objects, not primitives.")
    elif isinstance(data, dict):
        return pd.DataFrame([data]).astype(str)
    else:
        raise ValueError(f"Unsupported JSON root type: {type(data).__name__}")


def parse_jsonl(content_bytes: bytes) -> pd.DataFrame:
    """Parse JSONL (newline-delimited JSON) bytes into a DataFrame."""
    encoding = detect_encoding(content_bytes)
    text = content_bytes.decode(encoding, errors="replace")
    records = []
    for line_num, line in enumerate(text.strip().splitlines(), 1):
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
            if isinstance(obj, dict):
                records.append(obj)
            else:
                raise ValueError(
                    f"Line {line_num}: expected object, got {type(obj).__name__}"
                )
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON on line {line_num}: {e}")

    if not records:
        return pd.DataFrame()
    return pd.DataFrame(records).astype(str)


def parse_file(content_bytes: bytes, filename: str) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Parse a file and return (DataFrame, format_info).

    Returns:
        Tuple of (DataFrame, format_info dict with keys:
            encoding, format, delimiter, row_count, column_count)

    Raises:
        ValueError: If file format is unsupported or parsing fails.
    """
    ext = get_file_extension(filename)
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file format: '{ext}'. "
            f"Supported: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    encoding = detect_encoding(content_bytes)

    format_info: dict[str, Any] = {
        "encoding": encoding,
        "format": ext.lstrip("."),
        "original_filename": sanitize_filename(filename),
        "file_size_bytes": len(content_bytes),
    }

    if ext == ".csv":
        df = parse_csv(content_bytes, delimiter=",")
        format_info["delimiter"] = ","
    elif ext == ".tsv":
        df = parse_csv(content_bytes, delimiter="\t")
        format_info["delimiter"] = "\t"
    elif ext == ".json":
        df = parse_json(content_bytes)
        format_info["delimiter"] = None
    elif ext == ".jsonl":
        df = parse_jsonl(content_bytes)
        format_info["delimiter"] = None
    else:
        raise ValueError(f"Unsupported extension: {ext}")

    format_info["row_count"] = len(df)
    format_info["column_count"] = len(df.columns)

    return df, format_info
