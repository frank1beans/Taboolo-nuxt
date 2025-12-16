from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

# --- Shared ---
class MongoModel(BaseModel):
    """Base model for MongoDB compatibility"""
    id: Optional[str] = Field(None, alias="_id")

    class Config:
        populate_by_name = True

# --- Projects ---
class Project(MongoModel):
    code: str
    name: str
    description: Optional[str] = None
    business_unit: Optional[str] = Field(None, alias="businessUnit")
    status: str = "active"
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")
    updated_at: datetime = Field(default_factory=datetime.utcnow, alias="updatedAt")

# --- Groups (WBS) ---
class WbsNode(MongoModel):
    project_id: str = Field(..., alias="projectId")
    code: str
    description: str
    level: int
    type: Optional[str] = None # e.g. "L1", "Supercategorie"
    parent_id: Optional[str] = Field(None, alias="parentId")
    path: Optional[str] = None # Materialized path e.g. /ROOT/A/A01

# --- Price Lists ---
class PriceListItem(BaseModel):
    id: str = Field(..., alias="_id") # Generate UUID/ObjectId before saving
    code: str
    description: str
    extra_description: Optional[str] = Field(None, alias="extraDescription")
    unit: str # Direct value, e.g. "mq"
    price: float
    group_ids: List[str] = Field(default_factory=list, alias="groupIds")

class PriceList(MongoModel):
    project_id: str = Field(..., alias="projectId")
    name: str
    currency: str = "EUR"
    items: List[PriceListItem] = Field(default_factory=list)

# --- Estimates ---
class MeasurementDetail(BaseModel):
    formula: str
    value: float
    
class EstimateItem(BaseModel):
    id: str = Field(..., alias="_id")
    progressive: Optional[float] = None # Added progressive field
    price_list_item_id: Optional[str] = Field(None, alias="priceListItemId")
    related_item_id: Optional[str] = Field(None, alias="relatedItemId") # For 'Vedi Voce'
    group_ids: List[str] = Field(default_factory=list, alias="groupIds")
    
    description: Optional[str] = None # Snapshot
    unit: Optional[str] = None # Snapshot
    
    quantity: float
    amount: Optional[float] = None # Calculated amount (legacy compatibility)
    measurements: List[MeasurementDetail] = Field(default_factory=list)

class Estimate(MongoModel):
    project_id: str = Field(..., alias="projectId")
    price_list_id: Optional[str] = Field(None, alias="priceListId")
    name: str
    description: Optional[str] = None
    items: List[EstimateItem] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")
    updated_at: datetime = Field(default_factory=datetime.utcnow, alias="updatedAt")
