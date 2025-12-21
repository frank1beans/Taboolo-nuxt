"""
WbsNode - Domain entity for Work Breakdown Structure nodes.
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class WbsNode(BaseModel):
    """
    A node in the Work Breakdown Structure hierarchy.
    
    Supports both spatial (L1, L2...) and commodity (categories, chapters) structures.
    """
    id: str
    code: str
    name: Optional[str] = None
    level: int = 0
    
    # Type: 'spatial', 'commodity', or specific like 'L1', 'SuperCategorie'
    type: Optional[str] = None
    
    # Hierarchy
    parent_id: Optional[str] = None
    path: Optional[str] = None  # Materialized path e.g. /ROOT/A/A01
    
    # Custom properties
    properties: Dict[str, Any] = Field(default_factory=dict)
    
    @property
    def description(self) -> str:
        """Get description (name or code as fallback)."""
        return self.name or self.code

    class Config:
        populate_by_name = True
