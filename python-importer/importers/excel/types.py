from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Sequence


@dataclass
class ParsedWbsLevel:
    level: int
    code: str | None
    description: str | None


@dataclass
class ParsedItem:
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
    title: str | None
    total_amount: float | None
    total_quantity: float | None
    items: list[ParsedItem]
    stats: dict[str, Any] | None = None
