"""
Money - Value object for monetary amounts with currency.
"""

from decimal import Decimal, ROUND_HALF_UP
from dataclasses import dataclass


@dataclass(frozen=True)
class Money:
    """
    Immutable value object representing a monetary amount.
    
    Uses Decimal internally for precision.
    """
    amount: Decimal
    currency: str = "EUR"
    
    @classmethod
    def from_float(cls, value: float, currency: str = "EUR") -> "Money":
        """Create Money from a float value."""
        return cls(
            amount=Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
            currency=currency
        )
    
    @classmethod
    def zero(cls, currency: str = "EUR") -> "Money":
        """Create zero Money."""
        return cls(amount=Decimal("0.00"), currency=currency)
    
    def __add__(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise ValueError(f"Cannot add {self.currency} to {other.currency}")
        return Money(self.amount + other.amount, self.currency)
    
    def __mul__(self, factor: float) -> "Money":
        result = self.amount * Decimal(str(factor))
        return Money(
            result.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
            self.currency
        )
    
    def to_float(self) -> float:
        """Convert to float for serialization."""
        return float(self.amount)
    
    def __str__(self) -> str:
        return f"{self.amount:.2f} {self.currency}"
