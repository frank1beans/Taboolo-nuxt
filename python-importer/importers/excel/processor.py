from __future__ import annotations

from typing import Any

import pandas as pd

from importers.common import (
    _ceil_amount,
    _normalize_wbs7_code,
    _looks_like_wbs7_code,
)
from importers.excel.types import ParsedWbsLevel


def drop_empty_columns(rows: list[tuple[Any, ...]]):
    if not rows:
        return [], 0, []
    df = pd.DataFrame(rows)
    keep_mask = ~(df.isna().all(axis=0))
    kept_indexes = [idx for idx, keep in enumerate(keep_mask) if keep]
    dropped = len(rows[0]) - len(kept_indexes)
    cleaned = [tuple(val for idx, val in enumerate(row) if keep_mask.iloc[idx]) for row in rows]
    return cleaned, dropped, kept_indexes


def locate_header_row(rows: list[tuple[Any, ...]]) -> int | None:
    for idx, row in enumerate(rows[:10]):
        values = [cell for cell in row if cell is not None]
        if len(values) >= 2:
            return idx
    return None


def row_has_values(row: tuple[Any, ...]) -> bool:
    return any(cell not in (None, "", " ") for cell in row)


def column_has_values(rows: list[tuple[Any, ...]], indexes: list[int]) -> bool:
    for row in rows:
        for idx in indexes:
            if idx < len(row) and row[idx] not in (None, "", " "):
                return True
    return False


def combine_code(row: tuple[Any, ...], indexes: list[int]) -> str | None:
    parts = []
    for idx in indexes:
        if idx < len(row):
            value = row[idx]
            if value:
                parts.append(str(value).strip())
    return " ".join(parts) if parts else None


def combine_text(row: tuple[Any, ...], indexes: list[int]) -> str | None:
    parts = []
    for idx in indexes:
        if idx < len(row):
            value = row[idx]
            if value:
                parts.append(str(value).strip())
    return " ".join(parts) if parts else None


def cell_to_float(row: tuple[Any, ...], index: int | None) -> float | None:
    if index is None or index >= len(row):
        return None
    value = row[index]
    if value is None:
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def cell_to_progressive(row: tuple[Any, ...], index: int | None) -> int | None:
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
    filtered: list[tuple[Any, ...]] = []
    for row in rows:
        filtered.append(tuple(val for idx, val in enumerate(row) if idx in indexes))
    return filtered


def extract_wbs_levels(row: tuple[Any, ...], description_indexes: list[int]) -> list[ParsedWbsLevel]:
    levels: list[ParsedWbsLevel] = []
    # Try to infer WBS7 from description/code
    for idx in description_indexes:
        if idx < len(row):
            value = row[idx]
            if value and isinstance(value, str) and _looks_like_wbs7_code(value):
                normalized = _normalize_wbs7_code(value)
                if normalized:
                    levels.append(ParsedWbsLevel(level=7, code=normalized, description=None))
                    break
    return levels


def sanitize_price_candidate(value: float | None) -> float | None:
    if value is None:
        return None
    if value < 0:
        return None
    return _ceil_amount(value)


def has_external_formula(row: tuple[Any, ...] | None, index: int | None) -> bool:
    """
    Detect if the cell at given index contains an external formula reference.
    External references usually contain '!' or '[' in the formula string.
    """
    if row is None or index is None:
        return False
    if index >= len(row):
        return False
    cell = row[index]
    try:
        value = cell.value  # type: ignore[attr-defined]
    except Exception:
        value = None
    if not isinstance(value, str):
        return False
    if not value.startswith("="):
        return False
    text = value.lower()
    return "!" in text or "[" in text
