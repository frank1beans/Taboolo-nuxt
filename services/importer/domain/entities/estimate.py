"""
Estimate - Domain aggregate root for a project estimate (preventivo/computo).
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

from .measurement import Measurement
from .price_list_item import PriceListItem
from .wbs_node import WbsNode
from .price_list import PriceList


class EstimateItem(BaseModel):
    """
    A single line item in the estimate.
    
    Links a measurement to its calculated values (quantity, price, amount).
    """
    id: str
    progressive: Optional[float] = None
    
    # Links
    price_list_item_id: Optional[str] = None
    related_item_id: Optional[str] = None  # "Vedi Voce"
    wbs_ids: List[str] = Field(default_factory=list)
    
    # Calculated values
    quantity: float = 0.0
    unit_price: float = 0.0
    amount: float = 0.0
    
    # Measurement details (for audit trail)
    measurements: List[Dict[str, Any]] = Field(default_factory=list)

    class Config:
        populate_by_name = True


class Preventivo(BaseModel):
    """
    A single preventivo (subset of estimate).
    
    A SIX file can contain multiple preventivi.
    """
    id: str
    code: str
    name: Optional[str] = None
    measurements: List[Measurement] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        populate_by_name = True


class Estimate(BaseModel):
    """
    The aggregate root for an imported estimate.
    
    Contains all data parsed from a SIX/XPWE/Excel file.
    This is the main output of the parsing process.
    """
    project_name: Optional[str] = None
    
    # Catalog data
    price_lists: List[PriceList] = Field(default_factory=list)
    price_list_items: List[PriceListItem] = Field(default_factory=list)
    wbs_nodes: List[WbsNode] = Field(default_factory=list)
    
    # Estimate data
    preventivi: List[Preventivo] = Field(default_factory=list)
    
    # Lookup tables
    units: Dict[str, str] = Field(default_factory=dict)  # id -> label
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    def get_price_list_item(self, item_id: str) -> Optional[PriceListItem]:
        """Find a price list item by ID."""
        return next((p for p in self.price_list_items if p.id == item_id), None)
    
    def get_wbs_node(self, node_id: str) -> Optional[WbsNode]:
        """Find a WBS node by ID."""
        return next((n for n in self.wbs_nodes if n.id == node_id), None)

    class Config:
        populate_by_name = True
