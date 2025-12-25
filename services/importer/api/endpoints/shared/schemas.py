"""
Shared Response Schemas for Import Endpoints
Avoids duplication between six.py, xpwe.py, etc.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from infrastructure.dto import Project, WbsNode, PriceList, Estimate


class ImportResult(BaseModel):
    """Standard response for SIX/XPWE import endpoints."""
    project: Project
    groups: List[WbsNode]
    price_list: PriceList
    estimate: Estimate


class PreviewEstimate(BaseModel):
    """Lightweight estimate info for preview."""
    preventivoId: str
    code: str
    description: str
    stats: Dict[str, Any] = {}


class ImportPreviewResponse(BaseModel):
    """Standard response for import preview endpoints."""
    estimates: List[PreviewEstimate]
    preventivi: List[PreviewEstimate]
    groups_count: int
    products_count: int
    wbs_structure: Optional[List[Dict[str, Any]]] = None
    canonical_levels: Optional[Dict[str, Any]] = None
