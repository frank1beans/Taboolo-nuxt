from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Sequence


@dataclass
class NormalizedWbsLevel:
    level: int
    code: str | None
    description: str | None


@dataclass
class NormalizedItem:
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
    title: str | None
    total_amount: float | None
    total_quantity: float | None
    items: list[NormalizedItem]
    stats: dict[str, Any] | None = None
    price_catalog: list[dict[str, Any]] | None = None
    format: str | None = None
    source: str | None = None
    raw: Any | None = None  # optional raw parsed structure for debugging
