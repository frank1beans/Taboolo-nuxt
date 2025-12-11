"""Main API router aggregator (stateless importer version)."""
from fastapi import APIRouter

from core import settings as app_settings
from api.v1.endpoints import importer_stateless, returns

api_router = APIRouter(prefix=app_settings.api_v1_prefix)

# Stateless importer routes: SIX and returns (LX/MX/Excel)
api_router.include_router(importer_stateless.router, prefix="/commesse", tags=["commesse"])
api_router.include_router(returns.router, prefix="/commesse", tags=["commesse"])

__all__ = ["api_router"]
