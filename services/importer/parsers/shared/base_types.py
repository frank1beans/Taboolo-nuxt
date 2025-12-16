"""
Base types for importers - NO external dependencies within importers package.
This module must be importable without triggering any other imports.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Sequence


# =============================================================================
# PARSED TYPES (output of parsers)
# =============================================================================

@dataclass
class ParsedWbsLevel:
    """A single WBS level parsed from source data."""
    level: int
    code: str | None
    description: str | None


@dataclass
class ParsedItem:
    """A single line item parsed from source data."""
    order: int
    progressive: int | None
    code: str | None
    description: str | None
    wbs_levels: Sequence[ParsedWbsLevel]
    unit: str | None
    quantity: float | None
    unit_price: float | None
    amount: float | None
    notes: str | None
    metadata: dict[str, Any] | None = None


@dataclass
class ParsedEstimate:
    """A complete estimate parsed from source data."""
    title: str | None
    total_amount: float | None
    total_quantity: float | None
    items: list[ParsedItem]
    stats: dict[str, Any] | None = None


# =============================================================================
# NORMALIZED TYPES (standardized output)
# =============================================================================

@dataclass
class NormalizedWbsLevel:
    """A normalized WBS level."""
    level: int
    code: str | None
    description: str | None


@dataclass
class NormalizedItem:
    """A normalized line item."""
    order: int
    progressive: int | None
    code: str | None
    description: str | None
    wbs_levels: Sequence[NormalizedWbsLevel]
    unit: str | None
    quantity: float | None
    unit_price: float | None
    amount: float | None
    notes: str | None = None
    metadata: dict[str, Any] | None = None


@dataclass
class NormalizedEstimate:
    """A normalized estimate ready for downstream use."""
    title: str | None
    total_amount: float | None
    total_quantity: float | None
    items: list[NormalizedItem]
    stats: dict[str, Any] | None = None
    price_catalog: list[dict[str, Any]] | None = None
    format: str | None = None
    source: str | None = None
    raw: Any | None = None


# =============================================================================
# CONSTANTS
# =============================================================================

MAX_WBS_LEVELS = 7


# Type alias for backward compatibility
_CustomReturnParseResult = ParsedEstimate


__all__ = [
    # Parsed types
    "ParsedWbsLevel",
    "ParsedItem", 
    "ParsedEstimate",
    # Normalized types
    "NormalizedWbsLevel",
    "NormalizedItem",
    "NormalizedEstimate",
    # Constants
    "MAX_WBS_LEVELS",
    # Aliases
    "_CustomReturnParseResult",
]
