"""
PriceListItem - Domain entity representing an item in the price catalog.

Contains business logic for:
- Price lookup by price list ID
- Default price selection
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from decimal import Decimal


class PriceListItem(BaseModel):
    """
    A product/work item in the price catalog.
    
    Supports multiple prices for different price lists (listaQuotazioneId).
    """
    id: str
    code: str
    description: str
    long_description: Optional[str] = None
    extended_description: Optional[str] = None  # Concatenated parent descriptions for embeddings
    unit: str
    
    # Multiple prices by price list ID
    price_by_list: Dict[str, float] = Field(default_factory=dict)
    
    # WBS classification references
    wbs_ids: List[str] = Field(default_factory=list)
    category: Optional[str] = None
    
    # Additional properties
    properties: Dict[str, Any] = Field(default_factory=dict)

    # Extracted technical properties (LLM output)
    extracted_properties: Dict[str, Any] = Field(default_factory=dict)
    
    def get_price(self, price_list_id: Optional[str] = None) -> float:
        """
        Get price for a specific price list.
        
        Args:
            price_list_id: The ID of the price list to use.
                          If None, returns the first available price.
                          
        Returns:
            The price as float. Returns 0.0 if not found.
        """
        if not self.price_by_list:
            return 0.0
            
        if price_list_id and price_list_id in self.price_by_list:
            return self.price_by_list[price_list_id]
            
        # Fallback to first price
        return next(iter(self.price_by_list.values()), 0.0)
    
    @property
    def default_price(self) -> float:
        """Get the default (first) price."""
        return self.get_price()
    
    @property
    def has_multiple_prices(self) -> bool:
        """Check if this item has prices in multiple lists."""
        return len(self.price_by_list) > 1

    class Config:
        populate_by_name = True
