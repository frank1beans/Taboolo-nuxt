"""
AmountCalculator - Domain service for calculating price amounts.

Encapsulates the business logic for:
- Multiplying quantity by price
- Applying correct rounding rules (legacy STR Vision compatibility)
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Optional


class AmountCalculator:
    """
    Calculates amounts from quantity and price with business rounding rules.
    
    Follows legacy STR Vision rounding:
    - Round quantity to 2 decimals BEFORE multiplying
    - Round result to 2 decimals using ROUND_HALF_UP
    """
    
    PRECISION = Decimal("0.01")
    
    @classmethod
    def round_quantity(cls, quantity: float) -> Decimal:
        """Round quantity to 2 decimal places (legacy behavior)."""
        if quantity is None:
            return Decimal("0")
        return Decimal(str(quantity)).quantize(cls.PRECISION, rounding=ROUND_HALF_UP)
    
    @classmethod
    def round_amount(cls, amount: Decimal) -> Decimal:
        """Round amount to 2 decimal places."""
        return amount.quantize(cls.PRECISION, rounding=ROUND_HALF_UP)
    
    @classmethod
    def calculate(
        cls,
        quantity: float,
        unit_price: float,
        round_quantity_first: bool = True
    ) -> tuple[float, float]:
        """
        Calculate amount from quantity and price.
        
        Args:
            quantity: The quantity value
            unit_price: The unit price
            round_quantity_first: If True, round quantity before multiplying (legacy mode)
            
        Returns:
            Tuple of (rounded_quantity, calculated_amount)
        """
        if quantity is None or unit_price is None:
            return 0.0, 0.0
            
        decimal_qty = Decimal(str(quantity))
        decimal_price = Decimal(str(unit_price))
        
        if round_quantity_first:
            decimal_qty = cls.round_quantity(quantity)
        
        amount = decimal_qty * decimal_price
        rounded_amount = cls.round_amount(amount)
        
        return float(decimal_qty), float(rounded_amount)
    
    @classmethod
    def calculate_simple(cls, quantity: float, unit_price: float) -> float:
        """
        Simple calculation returning just the amount.
        
        Uses legacy rounding (quantity rounded first).
        """
        _, amount = cls.calculate(quantity, unit_price, round_quantity_first=True)
        return amount
