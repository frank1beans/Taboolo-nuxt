"""
API Models - DTOs for API response serialization.

These models are optimized for API responses and MongoDB compatibility.
They include field aliases (e.g., id -> _id, project_id -> projectId).
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class MongoModel(BaseModel):
    """Base model with MongoDB _id serialization."""
    id: Optional[str] = Field(None, alias="_id")

    class Config:
        populate_by_name = True


# --- Projects ---

class Project(MongoModel):
    """Project DTO for API responses."""
    code: str
    name: str
    description: Optional[str] = None
    business_unit: Optional[str] = Field(None, alias="businessUnit")
    status: str = "active"
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")
    updated_at: datetime = Field(default_factory=datetime.utcnow, alias="updatedAt")


# --- WBS ---

class WbsNode(MongoModel):
    """WBS Node DTO for API responses."""
    project_id: str = Field(..., alias="projectId")
    code: str
    description: str
    level: int
    type: Optional[str] = None
    parent_id: Optional[str] = Field(None, alias="parentId")
    path: Optional[str] = None
    
    # Normalized description (e.g., "Cantierizzazioni" instead of "A001 - Cantierizzazioni")
    normalized_description: Optional[str] = Field(None, alias="normalizedDescription")
    
    # Semantic embedding for WBS6 categories
    embedding: Optional[List[float]] = None


# --- Price Lists ---

class PriceListItem(BaseModel):
    """Price List Item DTO for API responses."""
    id: str = Field(..., alias="_id")
    code: str
    description: str
    long_description: Optional[str] = Field(None, alias="longDescription")
    extended_description: Optional[str] = Field(None, alias="extendedDescription")
    unit: str
    price: float
    group_ids: List[str] = Field(default_factory=list, alias="groupIds")
    
    # Denormalized WBS fields for frontend Grid
    wbs6: Optional[str] = None
    wbs7: Optional[str] = None
    
    # Semantic Search
    embedding: Optional[List[float]] = None

    # Extracted technical properties (LLM output)
    extracted_properties: Optional[Dict[str, Any]] = Field(None, alias="extractedProperties")

    class Config:
        populate_by_name = True


class PriceList(MongoModel):
    """Price List container DTO."""
    project_id: str = Field(..., alias="projectId")
    name: str
    currency: str = "EUR"
    items: List[PriceListItem] = Field(default_factory=list)


# --- Estimates ---

class MeasurementDetail(BaseModel):
    """Measurement detail for audit trail."""
    formula: str
    value: float


class EstimateItem(BaseModel):
    """Estimate Item DTO for API responses."""
    id: str = Field(..., alias="_id")
    progressive: Optional[float] = None
    price_list_item_id: Optional[str] = Field(None, alias="priceListItemId")
    related_item_id: Optional[str] = Field(None, alias="relatedItemId")
    group_ids: List[str] = Field(default_factory=list, alias="groupIds")
    
    quantity: float
    unit_price: Optional[float] = Field(None, alias="unitPrice")
    amount: Optional[float] = None
    measurements: List[MeasurementDetail] = Field(default_factory=list)

    class Config:
        populate_by_name = True


class Estimate(MongoModel):
    """Estimate DTO for API responses."""
    project_id: str = Field(..., alias="projectId")
    price_list_id: Optional[str] = Field(None, alias="priceListId")
    name: str
    description: Optional[str] = None
    items: List[EstimateItem] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")
    updated_at: datetime = Field(default_factory=datetime.utcnow, alias="updatedAt")
