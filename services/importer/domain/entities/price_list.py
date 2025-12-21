"""
PriceList - Domain entity for price list metadata.
"""

from pydantic import BaseModel


class PriceList(BaseModel):
    """
    Metadata for a price list (listino).
    
    A project can have multiple price lists (e.g., different suppliers or years).
    """
    id: str
    code: str
    name: str
    currency: str = "EUR"
    priority: int = 0  # Lower = higher priority
    
    class Config:
        populate_by_name = True
