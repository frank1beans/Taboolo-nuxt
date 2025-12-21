"""Main API router aggregator (stateless importer version)."""
from fastapi import APIRouter

from core import settings as app_settings


from api.endpoints import xpwe as xpwe_endpoints
from api.endpoints import returns

api_router = APIRouter(prefix=app_settings.api_v1_prefix)

from api.endpoints import six as six_endpoints

# SIX Importer
api_router.include_router(six_endpoints.router, prefix="/commesse", tags=["commesse-six"])

# XPWE Importer
api_router.include_router(xpwe_endpoints.router, prefix="/commesse", tags=["commesse-xpwe"])

# Returns / Excel Importer
api_router.include_router(returns.router, prefix="/commesse", tags=["commesse-returns"])

from api.endpoints import analytics
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])

__all__ = ["api_router"]
