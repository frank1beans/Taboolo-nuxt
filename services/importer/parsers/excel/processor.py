"""
Excel processor utilities - cell and row manipulation.
Depends only on base_types and math_utils.
"""
from __future__ import annotations

from typing import Any

import pandas as pd

from parsers.shared.base_types import ParsedWbsLevel
from parsers.shared.math_utils import ceil_amount
from parsers.shared.wbs_utils import normalize_wbs7_code, looks_like_wbs7_code


def drop_empty_columns(rows: list[tuple[Any, ...]]):
    """Remove completely empty columns from row data."""
    if not rows:
        return [], 0, []
    df = pd.DataFrame(rows)
    keep_mask = ~(df.isna().all(axis=0))
    kept_indexes = [idx for idx, keep in enumerate(keep_mask) if keep]
    dropped = len(rows[0]) - len(kept_indexes)
    cleaned = [tuple(val for idx, val in enumerate(row) if keep_mask.iloc[idx]) for row in rows]
    return cleaned, dropped, kept_indexes


def locate_header_row(rows: list[tuple[Any, ...]]) -> int | None:
    """
    Find the header row in Excel data.
    
    Improved logic: finds the first row where at least 60% of columns 
    are filled (or minimum 4 cells). This skips sparse title/header rows.
    """
    if not rows:
        return None
    
    # Find max column count
    max_cols = max(len(row) for row in rows) if rows else 0
    if max_cols == 0:
        return None
    
    # Threshold: at least 60% filled, minimum 4
    threshold = max(4, int(max_cols * 0.6))
    
    # Search first 30 rows
    for idx, row in enumerate(rows[:30]):
        filled = sum(1 for cell in row if cell not in (None, "", " "))
        if filled >= threshold:
            return idx
    
    # Fallback: first row with at least 3 values
    for idx, row in enumerate(rows[:30]):
        filled = sum(1 for cell in row if cell not in (None, "", " "))
        if filled >= 3:
            return idx
    
    return None


def row_has_values(row: tuple[Any, ...]) -> bool:
    """Check if a row has any non-empty values."""
    return any(cell not in (None, "", " ") for cell in row)


def column_has_values(rows: list[tuple[Any, ...]], indexes: list[int]) -> bool:
    """Check if specified columns have any values."""
    for row in rows:
        for idx in indexes:
            if idx < len(row) and row[idx] not in (None, "", " "):
                return True
    return False


def combine_code(row: tuple[Any, ...], indexes: list[int]) -> str | None:
    """Combine multiple code columns into one string."""
    parts = []
    for idx in indexes:
        if idx < len(row):
            value = row[idx]
            if value:
                parts.append(str(value).strip())
    return " ".join(parts) if parts else None


def combine_text(row: tuple[Any, ...], indexes: list[int]) -> str | None:
    """Combine multiple text columns into one string."""
    parts = []
    for idx in indexes:
        if idx < len(row):
            value = row[idx]
            if value:
                parts.append(str(value).strip())
    return " ".join(parts) if parts else None


def cell_to_float(row: tuple[Any, ...], index: int | None) -> float | None:
    """Extract a float value from a cell, handling EU-style decimals and currency symbols."""
    if index is None or index >= len(row):
        return None
    value = row[index]
    if value is None:
        return None
    # Numeric types pass through
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        raw = value.strip()
        if not raw:
            return None
        # Remove currency and spaces, keep signs/separators
        import re
        cleaned = re.sub(r"[^\d,.\-]", "", raw)
        if not cleaned:
            return None
        # If both '.' and ',' are present, assume ',' is decimal and '.' thousand
        if "," in cleaned and "." in cleaned:
            cleaned = cleaned.replace(".", "").replace(",", ".")
        elif "," in cleaned and "." not in cleaned:
            # Only comma present -> decimal separator
            cleaned = cleaned.replace(",", ".")
        try:
            return float(cleaned)
        except (ValueError, TypeError):
            return None
    return None


def cell_to_progressive(row: tuple[Any, ...], index: int | None) -> int | None:
    """Extract a progressive (integer) value from a cell."""
    if index is None or index >= len(row):
        return None
    value = row[index]
    if value is None:
        return None
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return None


def apply_column_filter(rows: list[tuple[Any, ...]], indexes: list[int]):
    """Filter rows to only include specified column indexes."""
    filtered: list[tuple[Any, ...]] = []
    for row in rows:
        filtered.append(tuple(val for idx, val in enumerate(row) if idx in indexes))
    return filtered


def extract_wbs_levels(row: tuple[Any, ...], description_indexes: list[int]) -> list[ParsedWbsLevel]:
    """Extract WBS levels from row data."""
    levels: list[ParsedWbsLevel] = []
    for idx in description_indexes:
        if idx < len(row):
            value = row[idx]
            if value and isinstance(value, str) and looks_like_wbs7_code(value):
                normalized = normalize_wbs7_code(value)
                if normalized:
                    levels.append(ParsedWbsLevel(level=7, code=normalized, description=None))
                    break
    return levels


def sanitize_price_candidate(value: float | None) -> float | None:
    """Sanitize and round a price value."""
    if value is None:
        return None
    if value < 0:
        return None
    return ceil_amount(value)


def has_external_formula(row: tuple[Any, ...] | None, index: int | None) -> bool:
    """Detect if a cell contains an external formula reference."""
    if row is None or index is None:
        return False
    if index >= len(row):
        return False
    cell = row[index]
    try:
        value = cell.value
    except Exception:
        value = None
    if not isinstance(value, str):
        return False
    if not value.startswith("="):
        return False
    text = value.lower()
    return "!" in text or "[" in text


__all__ = [
    "drop_empty_columns",
    "locate_header_row",
    "row_has_values",
    "column_has_values",
    "combine_code",
    "combine_text",
    "cell_to_float",
    "cell_to_progressive",
    "apply_column_filter",
    "extract_wbs_levels",
    "sanitize_price_candidate",
    "has_external_formula",
]
