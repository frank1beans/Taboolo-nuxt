"""
WBS (Work Breakdown Structure) utilities - depends only on base_types.
"""
from __future__ import annotations

import re
from typing import Optional, Sequence

from parsers.shared.base_types import ParsedItem, ParsedWbsLevel, MAX_WBS_LEVELS


def normalize_wbs6_code(value: Optional[str]) -> Optional[str]:
    """Normalize a WBS6 code by removing special characters."""
    if not value:
        return None
    text = re.sub(r"[^A-Za-z0-9]", "", str(value)).upper()
    return text or None


def normalize_wbs7_code(value: Optional[str]) -> Optional[str]:
    """Normalize a WBS7 code, allowing dots, underscores, and hyphens."""
    if not value:
        return None
    text = re.sub(r"[^A-Za-z0-9._-]", "", str(value)).upper()
    return text or None


def looks_like_wbs7_code(value: Optional[str]) -> bool:
    """Check if a value looks like a WBS7 code."""
    if not value:
        return False
    text = str(value).strip().upper()
    if not any(sep in text for sep in (".", "_", "-")):
        return False
    if len(text) < 3:
        return False
    return bool(re.match(r"^[A-Z0-9]{1,10}(?:[._-][A-Z0-9]+)+$", text))


def map_wbs_levels(levels: Sequence[ParsedWbsLevel]) -> dict[str, str | None]:
    """Map WBS levels to a flat dictionary."""
    data: dict[str, str | None] = {}
    by_level = {level.level: level for level in levels}
    for idx in range(1, MAX_WBS_LEVELS + 1):
        entry = by_level.get(idx)
        data[f"wbs_{idx}_code"] = entry.code if entry else None
        data[f"wbs_{idx}_description"] = entry.description if entry else None
    return data


def build_global_voce_code(commessa_tag: str | None, parsed: ParsedItem) -> str | None:
    """Build a global unique code for a voce (line item)."""
    if not commessa_tag:
        return None
    base = parsed.code or (
        f"PROG-{parsed.progressive}"
        if parsed.progressive is not None
        else f"ORD-{parsed.order}"
    )
    if not base:
        return None
    normalized_code = str(base).strip()
    if not normalized_code:
        return None
    wbs6_code = None
    wbs7_code = None
    for level in parsed.wbs_levels:
        if level.level == 6 and wbs6_code is None:
            wbs6_code = level.code
        if level.level == 7 and wbs7_code is None:
            wbs7_code = level.code
    parts = [commessa_tag, normalized_code, wbs6_code, wbs7_code]
    return "::".join([p for p in parts if p])


# Legacy aliases with underscore prefix
_normalize_wbs6_code = normalize_wbs6_code
_normalize_wbs7_code = normalize_wbs7_code
_looks_like_wbs7_code = looks_like_wbs7_code
_map_wbs_levels = map_wbs_levels
_build_global_voce_code = build_global_voce_code


__all__ = [
    "normalize_wbs6_code",
    "normalize_wbs7_code",
    "looks_like_wbs7_code",
    "map_wbs_levels",
    "build_global_voce_code",
    "_normalize_wbs6_code",
    "_normalize_wbs7_code",
    "_looks_like_wbs7_code",
    "_map_wbs_levels",
    "_build_global_voce_code",
    "MAX_WBS_LEVELS",
]
