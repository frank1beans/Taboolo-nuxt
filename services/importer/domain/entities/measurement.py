"""
Measurement - Domain entity representing a measurement entry in an estimate.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class MeasurementDetail(BaseModel):
    """
    A single line in a measurement block.
    
    Represents one row of the measurement formula (L × W × H × N).
    """
    row_index: int = 0
    description: Optional[str] = None
    formula: str = ""
    quantity: float = 0.0
    
    # Dimension components
    length: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    parts: Optional[float] = None
    
    # Reference to another item ("Vedi Voce")
    is_reference: bool = False
    refers_to_id: Optional[str] = None


class Measurement(BaseModel):
    """
    A measurement entry that links a product to quantities.
    
    Key attributes:
    - product_id: Links to PriceListItem
    - price_list_id: Which price list to use for this measurement
    - total_quantity: Sum of all detail quantities
    """
    id: str
    progressive: Optional[str] = None
    
    # Links
    product_id: str
    price_list_id: Optional[str] = None  # Which price list to use
    related_item_id: Optional[str] = None  # "Vedi Voce" reference
    wbs_node_ids: List[str] = Field(default_factory=list)
    
    # Quantities
    total_quantity: float = 0.0
    details: List[MeasurementDetail] = Field(default_factory=list)
    
    # Notes
    notes: List[str] = Field(default_factory=list)
    
    def calculate_total(self) -> float:
        """Recalculate total from details."""
        return sum(d.quantity for d in self.details)

    class Config:
        populate_by_name = True
