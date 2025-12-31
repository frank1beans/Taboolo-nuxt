"""
Main API router aggregator.
Organizes all endpoint routers with clean imports.
"""

from fastapi import APIRouter

from core import settings as app_settings

# Import endpoint routers
from api.endpoints import six as six_endpoints
from api.endpoints import xpwe as xpwe_endpoints
from api.endpoints import returns as returns_endpoints
from api.endpoints import analytics_routes as analytics_endpoints
from api.endpoints import extraction as extraction_endpoints
from api.endpoints import price_estimator as price_estimator_endpoints

# Create main router with API prefix
api_router = APIRouter(prefix=app_settings.api_v1_prefix)

# --- Mount endpoint routers ---

# File Import Endpoints
api_router.include_router(
    six_endpoints.router, 
    prefix="/commesse", 
    tags=["import-six"]
)
api_router.include_router(
    xpwe_endpoints.router, 
    prefix="/commesse", 
    tags=["import-xpwe"]
)
api_router.include_router(
    returns_endpoints.router, 
    prefix="/commesse", 
    tags=["import-returns"]
)

# Analytics Endpoints
api_router.include_router(
    analytics_endpoints.router, 
    prefix="/analytics", 
    tags=["analytics"]
)

# Extraction Endpoints
api_router.include_router(
    extraction_endpoints.router, 
    prefix="/extraction", 
    tags=["extraction"]
)

# Price Estimator Endpoints
api_router.include_router(
    price_estimator_endpoints.router, 
    tags=["price-estimator"]
)

__all__ = ["api_router"]

