"""Main API router aggregator (stateless importer version)."""
from fastapi import APIRouter

from core import settings as app_settings

from api.endpoints import raw as raw_endpoints
from api.endpoints import xpwe as xpwe_endpoints
from api.endpoints import returns

api_router = APIRouter(prefix=app_settings.api_v1_prefix)

# NEW: Raw Six Importer (app/)
api_router.include_router(raw_endpoints.router, prefix="/commesse", tags=["commesse-raw"])

# XPWE Importer
api_router.include_router(xpwe_endpoints.router, prefix="/commesse", tags=["commesse-xpwe"])

# Returns / Excel Importer
api_router.include_router(returns.router, prefix="/commesse", tags=["commesse-returns"])

__all__ = ["api_router"]
