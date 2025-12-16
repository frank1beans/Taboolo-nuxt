"""
Common utilities - re-exports from dedicated modules for backward compatibility.
"""
from __future__ import annotations

# Re-export everything from dedicated modules
from parsers.shared.math_utils import (
    _calculate_line_amount,
    _ceil_amount,
    _ceil_decimal_value,
    calculate_line_amount,
    ceil_amount,
    ceil_decimal_value,
)

from parsers.shared.wbs_utils import (
    _normalize_wbs6_code,
    _normalize_wbs7_code,
    _looks_like_wbs7_code,
    _map_wbs_levels,
    _build_global_voce_code,
    normalize_wbs6_code,
    normalize_wbs7_code,
    looks_like_wbs7_code,
    map_wbs_levels,
    build_global_voce_code,
    MAX_WBS_LEVELS,
)

from parsers.shared.base_types import ParsedItem, ParsedWbsLevel


__all__ = [
    # Math utils
    "_calculate_line_amount",
    "_ceil_amount",
    "_ceil_decimal_value",
    "calculate_line_amount",
    "ceil_amount",
    "ceil_decimal_value",
    # WBS utils
    "_normalize_wbs6_code",
    "_normalize_wbs7_code",
    "_looks_like_wbs7_code",
    "_map_wbs_levels",
    "_build_global_voce_code",
    "normalize_wbs6_code",
    "normalize_wbs7_code",
    "looks_like_wbs7_code",
    "map_wbs_levels",
    "build_global_voce_code",
    # Constants
    "MAX_WBS_LEVELS",
    # Types (for backward compat)
    "ParsedItem",
    "ParsedWbsLevel",
]
