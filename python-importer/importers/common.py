from __future__ import annotations

import re
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional, Sequence

from importers.excel.types import ParsedItem, ParsedWbsLevel
from importers.excel.parser import MAX_WBS_LEVELS


def _ceil_decimal_value(value: float | Decimal | int, exponent: str) -> Decimal:
    decimal_value = Decimal(str(value))
    return decimal_value.quantize(Decimal(exponent), rounding=ROUND_HALF_UP)


def _ceil_amount(value: float | Decimal | int | None) -> float | None:
    if value is None:
        return None
    return float(_ceil_decimal_value(value, "0.01"))


def _calculate_line_amount(
    quantity: float | Decimal | None,
    price: float | None,
) -> tuple[float | None, float | None]:
    """
    Calculate amount from quantity and price using importer rounding logic.
    Returns (quantity, amount) rounded.
    """
    if quantity is None or price is None:
        return quantity, None

    decimal_qty = Decimal(str(quantity))
    decimal_price = Decimal(str(price))

    if decimal_qty == Decimal("0"):
        return 0.0, 0.0

    line_amount = (decimal_qty * decimal_price).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    return float(decimal_qty), float(line_amount)


def _normalize_wbs6_code(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    text = re.sub(r"[^A-Za-z0-9]", "", str(value)).upper()
    return text or None


def _normalize_wbs7_code(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    text = re.sub(r"[^A-Za-z0-9._-]", "", str(value)).upper()
    return text or None


def _looks_like_wbs7_code(value: Optional[str]) -> bool:
    if not value:
        return False
    text = str(value).strip().upper()
    if not any(sep in text for sep in (".", "_", "-")):
        return False
    if len(text) < 3:
        return False
    return bool(re.match(r"^[A-Z0-9]{1,10}(?:[._-][A-Z0-9]+)+$", text))


def _map_wbs_levels(levels: Sequence[ParsedWbsLevel]) -> dict[str, str | None]:
    data: dict[str, str | None] = {}
    by_level = {level.level: level for level in levels}
    for idx in range(1, MAX_WBS_LEVELS + 1):
        entry = by_level.get(idx)
        data[f"wbs_{idx}_code"] = entry.code if entry else None
        data[f"wbs_{idx}_description"] = entry.description if entry else None
    return data


def _build_global_voce_code(commessa_tag: str | None, parsed: ParsedItem) -> str | None:
    if not commessa_tag:
        return None
    base = parsed.codice or (
        f"PROG-{parsed.progressivo}"
        if parsed.progressivo is not None
        else f"ORD-{parsed.ordine}"
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


__all__ = [
    "_calculate_line_amount",
    "_ceil_amount",
    "_normalize_wbs6_code",
    "_normalize_wbs7_code",
    "_looks_like_wbs7_code",
    "_map_wbs_levels",
    "_build_global_voce_code",
]
