"""
Math utilities for import calculations - NO external dependencies.
Pure functions only.
"""
from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP


def ceil_decimal_value(value: float | Decimal | int, exponent: str) -> Decimal:
    """Round a value to the specified decimal precision."""
    decimal_value = Decimal(str(value))
    return decimal_value.quantize(Decimal(exponent), rounding=ROUND_HALF_UP)


def ceil_amount(value: float | Decimal | int | None) -> float | None:
    """Round an amount to 2 decimal places."""
    if value is None:
        return None
    return float(ceil_decimal_value(value, "0.01"))


def calculate_line_amount(
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


# Legacy aliases with underscore prefix for backward compatibility
_ceil_decimal_value = ceil_decimal_value
_ceil_amount = ceil_amount
_calculate_line_amount = calculate_line_amount


__all__ = [
    "ceil_decimal_value",
    "ceil_amount",
    "calculate_line_amount",
    "_ceil_decimal_value",
    "_ceil_amount",
    "_calculate_line_amount",
]
