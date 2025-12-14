from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Sequence

from openpyxl.utils import column_index_from_string, get_column_letter

from importers.excel.processor import column_has_values


@dataclass
class ColumnProfile:
    column_index: int
    column_letter: str
    header_label: str | None = None


@dataclass
class ColumnSuggestion:
    column_index: int
    column_letter: str
    header_label: str | None = None


def detect_column_suggestions(rows: list[tuple[Any, ...]], header_idx: int) -> dict[str, Any]:
    if header_idx < 0 or header_idx >= len(rows):
        return {"suggestions": {}, "profiles": []}
    header = rows[header_idx]
    profiles: list[ColumnProfile] = []
    suggestions: dict[str, ColumnSuggestion] = {}
    for idx, value in enumerate(header):
        if value is None:
            continue
        label = str(value).strip()
        letter = get_column_letter(idx + 1)
        profile = ColumnProfile(column_index=idx, column_letter=letter, header_label=label)
        profiles.append(profile)
        normalized = label.lower()
        if "cod" in normalized:
            suggestions.setdefault("codice", ColumnSuggestion(idx, letter, label))
        if "desc" in normalized or "indicazione" in normalized:
            suggestions.setdefault("descrizione", ColumnSuggestion(idx, letter, label))
        if "prezzo" in normalized:
            suggestions.setdefault("prezzo", ColumnSuggestion(idx, letter, label))
        if "quant" in normalized:
            suggestions.setdefault("quantita", ColumnSuggestion(idx, letter, label))
        if "prog" in normalized:
            suggestions.setdefault("progressivo", ColumnSuggestion(idx, letter, label))
    return {"suggestions": suggestions, "profiles": profiles}


def columns_to_indexes(
    columns: Sequence[str],
    name: str,
    *,
    header_row: Sequence[Any] | None,
    required: bool = True,
) -> list[int]:
    if not columns:
        if required:
            raise ValueError(f"Columns {name} not provided")
        return []
    indexes: list[int] = []
    header_lookup = {str(val).strip().lower(): idx for idx, val in enumerate(header_row or []) if val}
    for col in columns:
        col_clean = col.strip()
        try:
            # If it is a letter (A,B,AA) convert to 0-based index
            index = column_index_from_string(col_clean) - 1
        except Exception:
            # Try matching the header title
            index = header_lookup.get(col_clean.lower())
        if index is None:
            if required:
                raise ValueError(f"Column {name} '{col}' not found")
            continue
        indexes.append(index)
    if not indexes and required:
        raise ValueError(f"Column {name} not found")
    return indexes


def single_column_index(
    column: str | None,
    name: str,
    *,
    header_row: Sequence[Any] | None,
    required: bool = True,
) -> int | None:
    if column is None and not required:
        return None
    if column is None and required:
        raise ValueError(f"Column {name} not provided")
    indexes = columns_to_indexes([column or ""], name, header_row=header_row, required=required)
    return indexes[0] if indexes else None


def warn_and_use(target: str, suggestion: ColumnSuggestion | None, warnings: list[str]) -> int | None:
    if suggestion is None:
        return None
    label = suggestion.header_label or suggestion.column_letter
    warnings.append(
        f"Column {target} not found in saved configuration. "
        f"Automatically using '{label}' ({suggestion.column_letter})."
    )
    return suggestion.column_index


def format_profiles(profiles: list[ColumnProfile]) -> str:
    entries: list[str] = []
    for profile in profiles[:10]:
        label = profile.header_label or "?"
        entries.append(f"{profile.letter}: {label}")
    return ", ".join(entries)


def ensure_indexes(
    name: str,
    indexes: list[int],
    data_rows: list[tuple[Any, ...]],
    suggestions: dict[str, ColumnSuggestion],
    profiles: list[ColumnProfile],
    warnings: list[str]
) -> list[int]:
    if indexes and column_has_values(data_rows, indexes):
        return indexes
    suggestion = suggestions.get(name)
    fallback = warn_and_use(name, suggestion, warnings)
    if fallback is not None:
        return [fallback]
    available = format_profiles(profiles)
    raise ValueError(
        f"Cannot find column {name}. "
        f"Detected headers: {available or 'no valid headers.'}"
    )
