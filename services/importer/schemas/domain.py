

from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field

class EntityType(str, Enum):
    WBS = "wbs"
    PRODUCT = "product"
    MEASUREMENT = "measurement"

class PriceList(BaseModel):
    id: str
    code: str
    name: str
    currency: str = "EUR"
    priority: int = 0

class WbsNode(BaseModel):
    id: str
    code: str
    name: Optional[str] = None
    level: int
    kind: Optional[str] = None
    parent_id: Optional[str] = None
    path: Optional[str] = None
    properties: Dict[str, Any] = Field(default_factory=dict)

class PriceListItem(BaseModel):
    id: str
    code: str
    description: str
    long_description: Optional[str] = None
    unit: str
    price_by_list: Dict[str, float] = Field(default_factory=dict)
    wbs_ids: List[str] = Field(default_factory=list)
    category: Optional[str] = None

class MeasurementDetail(BaseModel):
    """Represents a single line in a measurement block."""
    row_index: int
    description: Optional[str] = None
    formula: str
    quantity: float
    
    length: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    parts: Optional[float] = None
    
    is_reference: bool = False
    refers_to_id: Optional[str] = None

class Measurement(BaseModel):
    """Represents a measurement entry."""
    id: str
    progressive: Optional[str] = None # Added progressive field
    wbs_node_ids: List[str] = Field(default_factory=list)
    product_id: str
    related_item_id: Optional[str] = None # For 'Vedi Voce'
    
    total_quantity: float
    details: List[MeasurementDetail] = Field(default_factory=list)
    
    price_list_id: Optional[str] = None
    notes: List[str] = Field(default_factory=list)

class PreventivoModel(BaseModel):
    id: str
    code: str
    name: Optional[str] = None 
    measurements: List[Measurement] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class NormalizedEstimate(BaseModel):
    project_name: Optional[str] = None
    price_lists: List[PriceList] = Field(default_factory=list)
    wbs_nodes: List[WbsNode] = Field(default_factory=list)
    price_list_items: List[PriceListItem] = Field(default_factory=list)
    units: Dict[str, str] = Field(default_factory=dict)
    preventivi: List[PreventivoModel] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
