"""
Price Estimator API Endpoints
=============================
REST endpoints for price estimation functionality.
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from analytics.price_estimator import PriceEstimator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/price-estimator", tags=["Price Estimator"])


# =============================================================================
# Request/Response Models
# =============================================================================

class EstimateRequest(BaseModel):
    """Request body for price estimation."""
    query: str = Field(..., description="Free text description of the item to estimate")
    project_ids: Optional[List[str]] = Field(None, description="Filter to specific projects")
    top_k: int = Field(10, ge=1, le=50, description="Number of similar items to consider")
    min_similarity: float = Field(0.4, ge=0.0, le=1.0, description="Minimum embedding similarity")
    unit: Optional[str] = Field(None, description="Force specific unit of measurement")


class PropertyResponse(BaseModel):
    """Extracted property response."""
    value: Optional[str] = None
    confidence: float = 0.0
    evidence: Optional[str] = None


class PropertyMatchResponse(BaseModel):
    """Property match result."""
    name: str
    query_value: Optional[str] = None
    item_value: Optional[str] = None
    is_match: bool = False
    match_score: float = 0.0


class SimilarItemResponse(BaseModel):
    """Similar item response."""
    id: str
    code: str
    description: str
    price: float
    unit: str
    project_name: str
    similarity: float
    combined_score: float
    property_matches: List[PropertyMatchResponse] = []


class PriceEstimateResponse(BaseModel):
    """Price estimate response."""
    value: float
    range_low: float
    range_high: float
    confidence: float
    unit: str
    available_units: dict = {}
    method: str = "weighted_interpolation"


class EstimateResponse(BaseModel):
    """Complete estimation response."""
    query: str
    extracted_properties: dict = {}
    estimated_price: Optional[PriceEstimateResponse] = None
    similar_items: List[SimilarItemResponse] = []
    error: Optional[str] = None


# =============================================================================
# Endpoints
# =============================================================================

@router.post("/estimate", response_model=EstimateResponse)
async def estimate_price(request: EstimateRequest):
    """
    Estimate price for an item not in the price list.
    
    Uses LLM property extraction + semantic search + weighted interpolation.
    """
    logger.info(f"Price estimation request: {request.query[:50]}...")
    
    if not request.query or len(request.query.strip()) < 3:
        raise HTTPException(status_code=400, detail="Query must be at least 3 characters")
    
    estimator = PriceEstimator()
    
    try:
        result = estimator.estimate(
            query=request.query,
            project_ids=request.project_ids,
            top_k=request.top_k,
            min_similarity=request.min_similarity,
            unit=request.unit,
        )
        
        # Convert to response model
        extracted_props = {}
        for name, prop in result.extracted_properties.items():
            extracted_props[name] = {
                "value": str(prop.value) if prop.value is not None else None,
                "confidence": prop.confidence,
                "evidence": prop.evidence,
            }
        
        similar_items = []
        for item in result.similar_items:
            prop_matches = [
                PropertyMatchResponse(
                    name=m.name,
                    query_value=str(m.query_value) if m.query_value is not None else None,
                    item_value=str(m.item_value) if m.item_value is not None else None,
                    is_match=m.is_match,
                    match_score=m.match_score,
                )
                for m in item.property_matches
            ]
            similar_items.append(SimilarItemResponse(
                id=item.id,
                code=item.code,
                description=item.description[:200] if item.description else "",
                price=item.price,
                unit=item.unit,
                project_name=item.project_name,
                similarity=round(item.similarity, 3),
                combined_score=round(item.combined_score, 3),
                property_matches=prop_matches,
            ))
        
        price_estimate = None
        if result.estimated_price:
            price_estimate = PriceEstimateResponse(
                value=result.estimated_price.value,
                range_low=result.estimated_price.range_low,
                range_high=result.estimated_price.range_high,
                confidence=result.estimated_price.confidence,
                unit=result.estimated_price.unit,
                available_units=result.estimated_price.available_units,
                method=result.estimated_price.method,
            )
        
        return EstimateResponse(
            query=result.query,
            extracted_properties=extracted_props,
            estimated_price=price_estimate,
            similar_items=similar_items,
            error=result.error,
        )
        
    except Exception as e:
        logger.error(f"Price estimation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        estimator.close()


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "price-estimator"}

