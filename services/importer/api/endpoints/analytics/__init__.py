"""
Analytics Module - Modular Entry Point

This module re-exports from the modular structure for backward compatibility.
The original analytics.py has been split into:
- schemas.py: Pydantic request/response models
- helpers.py: Utility functions for text processing

The main routes are still in the parent analytics_routes.py file but import from these modules.
"""

# Re-export schemas
from .schemas import (
    GravParams,
    ComputeMapRequest,
    SearchRequest,
    PriceAnalysisRequest,
    GlobalAnalysisRequest,
    GlobalComputeMapRequest,
    GlobalComputePropertyMapRequest,
    GlobalComputePropertiesRequest,
)

# Re-export helpers
from .helpers import (
    grav_dump,
    clean_wbs_desc,
    pick_description,
    build_detail_text,
    build_props_text,
    normalize_weights,
    hash_text,
    has_meaningful_value,
    trim_extracted_properties,
)

__all__ = [
    # Schemas
    "GravParams",
    "ComputeMapRequest",
    "SearchRequest",
    "PriceAnalysisRequest",
    "GlobalAnalysisRequest",
    "GlobalComputeMapRequest",
    "GlobalComputePropertyMapRequest",
    "GlobalComputePropertiesRequest",
    # Helpers
    "grav_dump",
    "clean_wbs_desc",
    "pick_description",
    "build_detail_text",
    "build_props_text",
    "normalize_weights",
    "hash_text",
    "has_meaningful_value",
    "trim_extracted_properties",
]
