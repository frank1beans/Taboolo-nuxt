from __future__ import annotations

from typing import Any

from importers.excel.types import ParsedEstimate, ParsedItem, ParsedWbsLevel
from importers.types import NormalizedEstimate, NormalizedItem, NormalizedWbsLevel


def _normalize_wbs_levels(levels: list[ParsedWbsLevel]) -> list[NormalizedWbsLevel]:
    return [
        NormalizedWbsLevel(level=level.level, code=level.code, description=level.description)
        for level in levels
    ]


def _normalize_item(item: ParsedItem) -> NormalizedItem:
    return NormalizedItem(
        order=item.order,
        progressive=item.progressive,
        code=item.code,
        description=item.description,
        wbs_levels=_normalize_wbs_levels(list(item.wbs_levels)),
        unit=item.unit,
        quantity=item.quantity,
        unit_price=item.unit_price,
        amount=item.amount,
        notes=item.notes,
        metadata=item.metadata,
    )


def normalize_estimate(
    parsed: ParsedEstimate,
    *,
    format: str | None = None,
    source: str | None = None,
    price_catalog: list[dict[str, Any]] | None = None,
    raw: Any | None = None,
) -> NormalizedEstimate:
    return NormalizedEstimate(
        title=parsed.title,
        total_amount=parsed.total_amount,
        total_quantity=parsed.total_quantity,
        items=[_normalize_item(item) for item in parsed.items],
        stats=parsed.stats,
        price_catalog=price_catalog,
        format=format,
        source=source,
        raw=raw,
    )
