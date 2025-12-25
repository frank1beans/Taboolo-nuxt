"""
Analytics API Schemas
Pydantic models for request/response validation
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class GravParams(BaseModel):
    """
    Params for the gravitational model.
    - init params map to GravitationalClustering(...)
    - run params map to model.fit_predict(...)
    """
    # --- GravitationalClustering.__init__ params ---
    min_basin_size: int = Field(default=5, ge=1)
    adaptive_percentile: int = Field(default=20, ge=1, le=50)
    trim_fraction: float = Field(default=0.1, ge=0.0, le=0.49)
    prototype_method: str = Field(default="median")  # "median" | "trimmed_mean" | "mean"

    # --- fit_predict run-time params ---
    margin: float = Field(default=0.1, ge=0.0, le=1.0)
    top_k: int = Field(default=2, ge=2, le=5)
    strict_basins: bool = Field(default=True)

    # --- optional clustering overrides ---
    hdb_min_cluster_size: Optional[int] = Field(default=None, ge=2)
    hdb_min_samples: Optional[int] = Field(default=None, ge=1)
    agg_distance_threshold: float = Field(default=0.3, ge=0.0, le=2.0)

    # --- optional explain ---
    tfidf_stop_words: Optional[List[str]] = None


class ComputeMapRequest(BaseModel):
    projectId: str
    force: bool = False
    grav: GravParams = GravParams()


class SearchRequest(BaseModel):
    query: str
    projectId: Optional[str] = None
    limit: int = 20


class PriceAnalysisRequest(BaseModel):
    """Request schema for price analysis endpoint."""
    wbs6_filter: Optional[str] = None
    top_k: int = 30
    min_similarity: float = 0.55
    mad_threshold: float = 2.0
    min_category_size: int = 3
    estimation_method: str = "weighted_median"
    include_neighbors: bool = True


class GlobalAnalysisRequest(BaseModel):
    """Request schema for global multi-project analysis."""
    project_ids: Optional[List[str]] = None  # None = all projects
    year: Optional[int] = None
    business_unit: Optional[str] = None
    wbs6_filter: Optional[str] = None
    top_k: int = 30
    min_similarity: float = 0.55
    mad_threshold: float = 2.0
    min_category_size: int = 3
    estimation_method: str = "weighted_median"
    include_neighbors: bool = True


class GlobalComputeMapRequest(BaseModel):
    """Request for global UMAP computation."""
    project_ids: Optional[List[str]] = None  # None = all projects
    force: bool = False
    grav: GravParams = GravParams()


class GlobalComputePropertyMapRequest(BaseModel):
    """Request for global UMAP computation using properties-aware embeddings."""
    project_ids: Optional[List[str]] = None
    year: Optional[int] = None
    business_unit: Optional[str] = None
    embedding_mode: str = Field(default="weighted")  # description | properties | weighted | concat
    base_weight: float = Field(default=0.4, ge=0.0, le=1.0)
    detail_weight: float = Field(default=0.6, ge=0.0, le=1.0)
    min_confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    use_weighted_props: bool = False
    use_two_pass_embedding: bool = True
    props_replication_k: int = Field(default=3, ge=1, le=10)
    grav: GravParams = GravParams()


class GlobalComputePropertiesRequest(BaseModel):
    """Request for batch property extraction on items."""
    project_ids: Optional[List[str]] = None
    year: Optional[int] = None
    business_unit: Optional[str] = None
    only_missing: bool = True
    max_items: Optional[int] = Field(default=200, ge=1)
    sleep_seconds: float = Field(default=1.0, ge=0.0, le=10.0)
    min_confidence: float = Field(default=0.0, ge=0.0, le=1.0)
