"""
Price Analysis Pipeline
========================
Batch analysis for fair price estimation and outlier detection.
Uses embedding similarity + WBS06 category filtering.
"""

import os
import logging
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime, timezone

import numpy as np
from bson import ObjectId
import pymongo

logger = logging.getLogger(__name__)


# =============================================================================
# Data Classes
# =============================================================================

@dataclass
class AnalysisParams:
    """User-configurable parameters for price analysis."""
    top_k: int = 30
    min_similarity: float = 0.55
    mad_threshold: float = 2.0
    min_category_size: int = 3
    estimation_method: str = "weighted_median"  # or "trimmed_mean"
    trimmed_percent: float = 0.1
    wbs6_filter: Optional[str] = None
    include_neighbors: bool = True


@dataclass
class ItemAnalysis:
    """Analysis result for a single item."""
    item_id: str
    code: str
    description: str
    unit: str
    actual_price: float
    estimated_price: Optional[float] = None
    confidence_band: Optional[Tuple[float, float]] = None
    delta: Optional[float] = None  # (actual - estimated) / estimated
    neighbors_count: int = 0
    avg_similarity: float = 0.0
    is_outlier: bool = False
    outlier_severity: Optional[str] = None  # low, medium, high
    outlier_reason: Optional[str] = None
    top_neighbors: List[Dict] = field(default_factory=list)


@dataclass
class CategoryStats:
    """Statistics for a WBS06 category."""
    mean: float
    median: float
    std: float
    min: float
    max: float
    mad: float  # Median Absolute Deviation


@dataclass
class CategoryAnalysis:
    """Analysis result for a WBS06 category."""
    wbs6_code: str
    wbs6_description: str
    item_count: int
    items: List[ItemAnalysis] = field(default_factory=list)
    stats: Optional[CategoryStats] = None
    outlier_count: int = 0


@dataclass
class PriceAnalysisResult:
    """Complete analysis result for a project."""
    project_id: str
    total_items: int
    categories_analyzed: int
    outliers_found: int
    categories: List[CategoryAnalysis] = field(default_factory=list)
    computed_at: str = ""
    params_used: Optional[Dict] = None


# =============================================================================
# Core Math Functions
# =============================================================================

def cosine_similarity(a: List[float], b: List[float]) -> float:
    """
    Compute cosine similarity between two vectors.
    Returns value between -1 and 1 (typically 0-1 for embeddings).
    """
    a_arr = np.array(a)
    b_arr = np.array(b)
    
    norm_a = np.linalg.norm(a_arr)
    norm_b = np.linalg.norm(b_arr)
    
    if norm_a == 0 or norm_b == 0:
        return 0.0
    
    return float(np.dot(a_arr, b_arr) / (norm_a * norm_b))


def weighted_median(values: List[float], weights: List[float]) -> float:
    """
    Compute weighted median.
    More robust than weighted mean for price estimation.
    """
    if not values or not weights:
        return 0.0
    
    values_arr = np.array(values)
    weights_arr = np.array(weights)
    
    # Normalize weights
    weights_arr = weights_arr / np.sum(weights_arr)
    
    # Sort by values
    sorted_indices = np.argsort(values_arr)
    sorted_values = values_arr[sorted_indices]
    sorted_weights = weights_arr[sorted_indices]
    
    # Find median point
    cumsum = np.cumsum(sorted_weights)
    median_idx = np.searchsorted(cumsum, 0.5)
    
    if median_idx >= len(sorted_values):
        median_idx = len(sorted_values) - 1
    
    return float(sorted_values[median_idx])


def trimmed_mean(values: List[float], trim_pct: float = 0.1) -> float:
    """
    Compute trimmed mean, excluding top and bottom percentiles.
    Alternative robust estimator.
    """
    if not values:
        return 0.0
    
    values_arr = np.array(values)
    n = len(values_arr)
    
    if n < 3:
        return float(np.mean(values_arr))
    
    # Number of values to trim from each end
    trim_count = int(n * trim_pct)
    if trim_count == 0:
        trim_count = 1 if n > 2 else 0
    
    sorted_values = np.sort(values_arr)
    trimmed = sorted_values[trim_count:n - trim_count] if trim_count > 0 else sorted_values
    
    return float(np.mean(trimmed)) if len(trimmed) > 0 else float(np.mean(values_arr))


def median_absolute_deviation(values: List[float]) -> float:
    """
    Compute MAD = median(|x_i - median(x)|).
    Robust measure of dispersion.
    """
    if not values:
        return 0.0
    
    values_arr = np.array(values)
    median = np.median(values_arr)
    deviations = np.abs(values_arr - median)
    
    return float(np.median(deviations))


def compute_category_stats(prices: List[float]) -> CategoryStats:
    """Compute all statistics for a category."""
    if not prices:
        return CategoryStats(0, 0, 0, 0, 0, 0)
    
    prices_arr = np.array(prices)
    return CategoryStats(
        mean=float(np.mean(prices_arr)),
        median=float(np.median(prices_arr)),
        std=float(np.std(prices_arr)),
        min=float(np.min(prices_arr)),
        max=float(np.max(prices_arr)),
        mad=median_absolute_deviation(prices)
    )


# =============================================================================
# Price Analyzer
# =============================================================================

class PriceAnalyzer:
    """
    Main analyzer class for price analysis.
    Uses embedding similarity within WBS06 categories.
    """
    
    def __init__(self, db_uri: Optional[str] = None):
        self.db_uri = db_uri or os.getenv("MONGODB_URI", "mongodb://localhost:27017/test")
        self._client = None
        self._db = None
    
    def _get_db(self):
        """Get database connection (lazy init)."""
        if self._db is None:
            self._client = pymongo.MongoClient(self.db_uri, connectTimeoutMS=30000)
            try:
                self._db = self._client.get_database()
            except pymongo.errors.ConfigurationError:
                self._db = self._client.get_database("test")
        return self._db
    
    def _get_collection(self, name: str):
        """Get collection with fallback naming."""
        db = self._get_db()
        # Handle plural/singular naming
        if name == "pricelistitem":
            if "pricelistitems" in db.list_collection_names():
                return db.pricelistitems
            return db.pricelistitem
        elif name == "wbsnode":
            if "wbsnodes" in db.list_collection_names():
                return db.wbsnodes
            return db.wbsnode
        return db[name]
    
    def close(self):
        """Close database connection."""
        if self._client:
            self._client.close()
            self._client = None
            self._db = None
    
    def fetch_items_with_embeddings(
        self, 
        project_id: str
    ) -> List[Dict]:
        """
        Fetch all price list items with embeddings for a project.
        """
        coll = self._get_collection("pricelistitem")
        
        # Try both ObjectId and string
        try:
            pid = ObjectId(project_id)
        except:
            pid = project_id
        
        items = list(coll.find({
            "$or": [
                {"project_id": pid},
                {"project_id": project_id}
            ],
            "embedding": {"$exists": True, "$ne": None}
        }))
        
        logger.info(f"Fetched {len(items)} items with embeddings for project {project_id}")
        return items
    
    def fetch_wbs6_mapping(self, project_id: str) -> Dict[str, Dict]:
        """
        Fetch WBS06 nodes and build a mapping.
        Returns: { node_id_str: { code, description } }
        """
        coll = self._get_collection("wbsnode")
        
        try:
            pid = ObjectId(project_id)
        except:
            pid = project_id
        
        nodes = list(coll.find({
            "$or": [
                {"project_id": pid},
                {"project_id": project_id}
            ],
            "level": 6
        }))
        
        mapping = {}
        for node in nodes:
            node_id = str(node["_id"])
            mapping[node_id] = {
                "code": node.get("code", ""),
                "description": node.get("description", "")
            }
        
        logger.info(f"Found {len(mapping)} WBS06 categories")
        return mapping
    
    def resolve_item_wbs6(
        self, 
        item: Dict, 
        wbs6_mapping: Dict[str, Dict]
    ) -> Optional[str]:
        """
        Resolve WBS06 code for an item from its wbs_ids.
        Returns the WBS06 node_id if found.
        """
        wbs_ids = item.get("wbs_ids", [])
        for wbs_id in wbs_ids:
            wbs_id_str = str(wbs_id)
            if wbs_id_str in wbs6_mapping:
                return wbs_id_str
        return None
    
    def find_similar_items(
        self,
        target: Dict,
        candidates: List[Dict],
        params: AnalysisParams
    ) -> List[Dict]:
        """
        Find similar items within a category using embedding similarity.
        Returns list of neighbors with similarity scores.
        """
        target_embedding = target.get("embedding")
        if not target_embedding:
            return []
        
        target_id = str(target.get("_id", ""))
        neighbors = []
        
        for candidate in candidates:
            if str(candidate.get("_id", "")) == target_id:
                continue  # Skip self
            
            candidate_embedding = candidate.get("embedding")
            if not candidate_embedding:
                continue
            
            similarity = cosine_similarity(target_embedding, candidate_embedding)
            
            if similarity >= params.min_similarity:
                neighbors.append({
                    "item_id": str(candidate.get("_id", "")),
                    "code": candidate.get("code", ""),
                    "description": candidate.get("description", "")[:100],
                    "price": candidate.get("price", 0),
                    "unit": candidate.get("unit", ""),
                    "similarity": similarity
                })
        
        # Sort by similarity and take top-K
        neighbors.sort(key=lambda x: x["similarity"], reverse=True)
        return neighbors[:params.top_k]
    
    def estimate_fair_price(
        self,
        neighbors: List[Dict],
        params: AnalysisParams
    ) -> Tuple[Optional[float], Optional[Tuple[float, float]]]:
        """
        Estimate fair price from neighbors using robust statistics.
        Returns (estimated_price, (p25, p75) confidence band).
        """
        if not neighbors:
            return None, None
        
        prices = [n["price"] for n in neighbors if n.get("price") and n["price"] > 0]
        similarities = [n["similarity"] for n in neighbors if n.get("price") and n["price"] > 0]
        
        if not prices:
            return None, None
        
        # Estimate using chosen method
        if params.estimation_method == "weighted_median":
            estimated = weighted_median(prices, similarities)
        else:
            estimated = trimmed_mean(prices, params.trimmed_percent)
        
        # Confidence band (P25, P75)
        prices_arr = np.array(prices)
        p25 = float(np.percentile(prices_arr, 25))
        p75 = float(np.percentile(prices_arr, 75))
        
        return estimated, (p25, p75)
    
    def detect_outlier(
        self,
        actual_price: float,
        estimated_price: float,
        category_stats: CategoryStats,
        params: AnalysisParams
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Detect if a price is an outlier.
        Returns (is_outlier, severity, reason).
        """
        if estimated_price is None or estimated_price == 0:
            return False, None, None
        
        deviation = abs(actual_price - estimated_price)
        mad = category_stats.mad if category_stats.mad > 0 else 1
        
        # MAD-based detection
        z_robust = deviation / (1.4826 * mad)  # 1.4826 makes MAD consistent with std for normal dist
        
        is_outlier = z_robust > params.mad_threshold
        
        if not is_outlier:
            return False, None, None
        
        # Determine severity
        if z_robust > params.mad_threshold * 2:
            severity = "high"
        elif z_robust > params.mad_threshold * 1.5:
            severity = "medium"
        else:
            severity = "low"
        
        # Reason
        delta_pct = (actual_price - estimated_price) / estimated_price * 100
        direction = "superiore" if delta_pct > 0 else "inferiore"
        reason = f"Prezzo {direction} del {abs(delta_pct):.1f}% rispetto alla stima"
        
        return True, severity, reason
    
    def analyze_category(
        self,
        wbs6_id: str,
        wbs6_info: Dict,
        items: List[Dict],
        params: AnalysisParams
    ) -> CategoryAnalysis:
        """
        Analyze all items in a single WBS06 category.
        """
        category = CategoryAnalysis(
            wbs6_code=wbs6_info.get("code", ""),
            wbs6_description=wbs6_info.get("description", ""),
            item_count=len(items)
        )
        
        if len(items) < params.min_category_size:
            logger.debug(f"Skipping category {wbs6_id}: only {len(items)} items")
            return category
        
        # Compute category stats
        prices = [item.get("price", 0) for item in items if item.get("price") and item["price"] > 0]
        category.stats = compute_category_stats(prices)
        
        # Analyze each item
        for item in items:
            item_id = str(item.get("_id", ""))
            actual_price = item.get("price", 0)
            
            if not actual_price or actual_price <= 0:
                continue
            
            # Find similar items
            neighbors = self.find_similar_items(item, items, params)
            
            # Estimate fair price
            estimated, confidence_band = self.estimate_fair_price(neighbors, params)
            
            # Compute delta
            delta = None
            if estimated and estimated > 0:
                delta = (actual_price - estimated) / estimated
            
            # Detect outlier
            is_outlier, severity, reason = False, None, None
            if estimated and category.stats:
                is_outlier, severity, reason = self.detect_outlier(
                    actual_price, estimated, category.stats, params
                )
            
            # Build analysis result
            analysis = ItemAnalysis(
                item_id=item_id,
                code=item.get("code", ""),
                description=item.get("description", "")[:200],
                unit=item.get("unit", ""),
                actual_price=actual_price,
                estimated_price=estimated,
                confidence_band=confidence_band,
                delta=delta,
                neighbors_count=len(neighbors),
                avg_similarity=np.mean([n["similarity"] for n in neighbors]) if neighbors else 0,
                is_outlier=is_outlier,
                outlier_severity=severity,
                outlier_reason=reason,
                top_neighbors=neighbors[:5] if params.include_neighbors else []
            )
            
            category.items.append(analysis)
            if is_outlier:
                category.outlier_count += 1
        
        return category
    
    def analyze_project(
        self,
        project_id: str,
        params: Optional[AnalysisParams] = None
    ) -> PriceAnalysisResult:
        """
        Run full price analysis for a project.
        Groups items by WBS06 and analyzes each category.
        """
        params = params or AnalysisParams()
        
        logger.info(f"Starting price analysis for project {project_id}")
        logger.info(f"Parameters: top_k={params.top_k}, min_sim={params.min_similarity}, "
                   f"mad_threshold={params.mad_threshold}")
        
        # Fetch data
        items = self.fetch_items_with_embeddings(project_id)
        wbs6_mapping = self.fetch_wbs6_mapping(project_id)
        
        if not items:
            logger.warning(f"No items with embeddings found for project {project_id}")
            return PriceAnalysisResult(
                project_id=project_id,
                total_items=0,
                categories_analyzed=0,
                outliers_found=0,
                computed_at=datetime.now(timezone.utc).isoformat()
            )
        
        # Group items by WBS06
        items_by_wbs6: Dict[str, List[Dict]] = {}
        for item in items:
            wbs6_id = self.resolve_item_wbs6(item, wbs6_mapping)
            if wbs6_id:
                if wbs6_id not in items_by_wbs6:
                    items_by_wbs6[wbs6_id] = []
                items_by_wbs6[wbs6_id].append(item)
        
        # Filter by WBS6 if specified
        if params.wbs6_filter:
            # Find WBS6 by code
            target_id = None
            for wbs_id, info in wbs6_mapping.items():
                if info.get("code") == params.wbs6_filter:
                    target_id = wbs_id
                    break
            if target_id and target_id in items_by_wbs6:
                items_by_wbs6 = {target_id: items_by_wbs6[target_id]}
            else:
                items_by_wbs6 = {}
        
        # Analyze each category
        result = PriceAnalysisResult(
            project_id=project_id,
            total_items=len(items),
            categories_analyzed=0,
            outliers_found=0,
            computed_at=datetime.now(timezone.utc).isoformat(),
            params_used={
                "top_k": params.top_k,
                "min_similarity": params.min_similarity,
                "mad_threshold": params.mad_threshold,
                "estimation_method": params.estimation_method
            }
        )
        
        for wbs6_id, category_items in items_by_wbs6.items():
            wbs6_info = wbs6_mapping.get(wbs6_id, {"code": "", "description": ""})
            
            category_result = self.analyze_category(
                wbs6_id, wbs6_info, category_items, params
            )
            
            if category_result.items:  # Only add if we analyzed items
                result.categories.append(category_result)
                result.categories_analyzed += 1
                result.outliers_found += category_result.outlier_count
        
        logger.info(f"Analysis complete: {result.categories_analyzed} categories, "
                   f"{result.outliers_found} outliers found")
        
        return result


# =============================================================================
# Helper for API serialization
# =============================================================================

def result_to_dict(result: PriceAnalysisResult) -> Dict[str, Any]:
    """Convert result to serializable dict."""
    return {
        "project_id": result.project_id,
        "total_items": result.total_items,
        "categories_analyzed": result.categories_analyzed,
        "outliers_found": result.outliers_found,
        "computed_at": result.computed_at,
        "params_used": result.params_used,
        "categories": [
            {
                "wbs6_code": cat.wbs6_code,
                "wbs6_description": cat.wbs6_description,
                "item_count": cat.item_count,
                "outlier_count": cat.outlier_count,
                "stats": {
                    "mean": cat.stats.mean,
                    "median": cat.stats.median,
                    "std": cat.stats.std,
                    "min": cat.stats.min,
                    "max": cat.stats.max,
                    "mad": cat.stats.mad
                } if cat.stats else None,
                "items": [
                    {
                        "item_id": item.item_id,
                        "code": item.code,
                        "description": item.description,
                        "unit": item.unit,
                        "actual_price": item.actual_price,
                        "estimated_price": item.estimated_price,
                        "confidence_band": list(item.confidence_band) if item.confidence_band else None,
                        "delta": item.delta,
                        "neighbors_count": item.neighbors_count,
                        "avg_similarity": item.avg_similarity,
                        "is_outlier": item.is_outlier,
                        "outlier_severity": item.outlier_severity,
                        "outlier_reason": item.outlier_reason,
                        "top_neighbors": item.top_neighbors
                    }
                    for item in cat.items
                ]
            }
            for cat in result.categories
        ]
    }


# =============================================================================
# Global Multi-Project Analyzer
# =============================================================================

@dataclass
class GlobalAnalysisParams(AnalysisParams):
    """Extended params for multi-project analysis."""
    project_ids: Optional[List[str]] = None  # None = all projects
    year: Optional[int] = None
    business_unit: Optional[str] = None


@dataclass
class GlobalAnalysisResult:
    """Result for multi-project global analysis."""
    project_ids: List[str]
    total_items: int
    categories_analyzed: int
    outliers_found: int
    categories: List[CategoryAnalysis] = field(default_factory=list)
    computed_at: str = ""
    params_used: Optional[Dict] = None
    project_stats: Dict[str, int] = field(default_factory=dict)  # items per project


class GlobalPriceAnalyzer(PriceAnalyzer):
    """
    Extended analyzer for cross-project analysis.
    Supports filtering by year, business unit, and multiple projects.
    """
    
    def fetch_projects(
        self,
        project_ids: Optional[List[str]] = None,
        year: Optional[int] = None,
        business_unit: Optional[str] = None
    ) -> List[Dict]:
        """
        Fetch projects with optional filters.
        Returns list of project documents.
        """
        db = self._get_db()
        coll = db.projects if "projects" in db.list_collection_names() else db.project
        
        query: Dict[str, Any] = {}
        
        # Filter by specific project IDs
        if project_ids:
            oids = []
            for pid in project_ids:
                try:
                    oids.append(ObjectId(pid))
                except:
                    pass
            if oids:
                query["_id"] = {"$in": oids}
        
        # Filter by business unit
        if business_unit:
            query["business_unit"] = business_unit
        
        # Filter by year (from created_at)
        if year:
            from datetime import datetime
            start = datetime(year, 1, 1)
            end = datetime(year + 1, 1, 1)
            query["created_at"] = {"$gte": start, "$lt": end}
        
        projects = list(coll.find(query))
        logger.info(f"Fetched {len(projects)} projects with filters")
        return projects
    
    def fetch_items_multi_project(
        self,
        project_ids: List[str]
    ) -> List[Dict]:
        """
        Fetch price list items with embeddings from multiple projects.
        Adds project_id_str to each item for tracking.
        """
        coll = self._get_collection("pricelistitem")
        
        # Build $or query for all project IDs
        or_conditions = []
        for pid in project_ids:
            try:
                oid = ObjectId(pid)
                or_conditions.append({"project_id": oid})
            except:
                or_conditions.append({"project_id": pid})
        
        if not or_conditions:
            return []
        
        items = list(coll.find({
            "$or": or_conditions,
            "embedding": {"$exists": True, "$ne": None}
        }))
        
        # Add string project_id for tracking
        for item in items:
            item["project_id_str"] = str(item.get("project_id", ""))
        
        logger.info(f"Fetched {len(items)} items across {len(project_ids)} projects")
        return items
    
    def fetch_wbs6_multi_project(
        self,
        project_ids: List[str]
    ) -> Dict[str, Dict]:
        """
        Fetch WBS06 nodes from multiple projects.
        Normalizes by code (same WBS6 code = same category across projects).
        Returns: { wbs6_code: { code, description, node_ids: [...] } }
        """
        coll = self._get_collection("wbsnode")
        
        # Build $or query
        or_conditions = []
        for pid in project_ids:
            try:
                oid = ObjectId(pid)
                or_conditions.append({"project_id": oid})
            except:
                or_conditions.append({"project_id": pid})
        
        if not or_conditions:
            return {}
        
        nodes = list(coll.find({
            "$or": or_conditions,
            "level": 6
        }))
        
        # Group by WBS6 CODE (not ID) for cross-project matching
        mapping: Dict[str, Dict] = {}
        for node in nodes:
            code = node.get("code", "")
            if not code:
                continue
            
            if code not in mapping:
                mapping[code] = {
                    "code": code,
                    "description": node.get("description", ""),
                    "node_ids": []
                }
            mapping[code]["node_ids"].append(str(node["_id"]))
        
        logger.info(f"Found {len(mapping)} unique WBS06 codes across projects")
        return mapping
    
    def resolve_item_wbs6_by_code(
        self,
        item: Dict,
        wbs6_mapping: Dict[str, Dict]
    ) -> Optional[str]:
        """
        Resolve WBS06 code for an item.
        Matches by node_id being in any of the mapped node_ids.
        Returns the WBS6 CODE (not ID).
        """
        wbs_ids = item.get("wbs_ids", [])
        for wbs_id in wbs_ids:
            wbs_id_str = str(wbs_id)
            for code, info in wbs6_mapping.items():
                if wbs_id_str in info.get("node_ids", []):
                    return code
        return None
    
    def analyze_global(
        self,
        params: Optional[GlobalAnalysisParams] = None
    ) -> GlobalAnalysisResult:
        """
        Run global price analysis across multiple projects.
        Groups items by WBS6 CODE (not ID) for cross-project comparison.
        """
        params = params or GlobalAnalysisParams()
        
        logger.info(f"Starting global price analysis")
        logger.info(f"Filters: projects={params.project_ids}, year={params.year}, "
                   f"bu={params.business_unit}")
        
        # Fetch projects matching filters
        projects = self.fetch_projects(
            project_ids=params.project_ids,
            year=params.year,
            business_unit=params.business_unit
        )
        
        if not projects:
            logger.warning("No projects match the filters")
            return GlobalAnalysisResult(
                project_ids=[],
                total_items=0,
                categories_analyzed=0,
                outliers_found=0,
                computed_at=datetime.now(timezone.utc).isoformat()
            )
        
        project_ids = [str(p["_id"]) for p in projects]
        
        # Fetch items and WBS mappings
        items = self.fetch_items_multi_project(project_ids)
        wbs6_mapping = self.fetch_wbs6_multi_project(project_ids)
        
        if not items:
            logger.warning("No items with embeddings found across projects")
            return GlobalAnalysisResult(
                project_ids=project_ids,
                total_items=0,
                categories_analyzed=0,
                outliers_found=0,
                computed_at=datetime.now(timezone.utc).isoformat()
            )
        
        # Count items per project
        project_stats: Dict[str, int] = {}
        for item in items:
            pid = item.get("project_id_str", "")
            project_stats[pid] = project_stats.get(pid, 0) + 1
        
        # Group items by WBS6 CODE
        items_by_wbs6: Dict[str, List[Dict]] = {}
        for item in items:
            wbs6_code = self.resolve_item_wbs6_by_code(item, wbs6_mapping)
            if wbs6_code:
                if wbs6_code not in items_by_wbs6:
                    items_by_wbs6[wbs6_code] = []
                items_by_wbs6[wbs6_code].append(item)
        
        # Filter by WBS6 if specified
        if params.wbs6_filter:
            if params.wbs6_filter in items_by_wbs6:
                items_by_wbs6 = {params.wbs6_filter: items_by_wbs6[params.wbs6_filter]}
            else:
                items_by_wbs6 = {}
        
        # Analyze each category
        result = GlobalAnalysisResult(
            project_ids=project_ids,
            total_items=len(items),
            categories_analyzed=0,
            outliers_found=0,
            computed_at=datetime.now(timezone.utc).isoformat(),
            params_used={
                "top_k": params.top_k,
                "min_similarity": params.min_similarity,
                "mad_threshold": params.mad_threshold,
                "estimation_method": params.estimation_method,
                "year": params.year,
                "business_unit": params.business_unit
            },
            project_stats=project_stats
        )
        
        for wbs6_code, category_items in items_by_wbs6.items():
            wbs6_info = wbs6_mapping.get(wbs6_code, {"code": wbs6_code, "description": ""})
            
            category_result = self.analyze_category(
                wbs6_code, wbs6_info, category_items, params
            )
            
            if category_result.items:
                result.categories.append(category_result)
                result.categories_analyzed += 1
                result.outliers_found += category_result.outlier_count
        
        logger.info(f"Global analysis complete: {result.categories_analyzed} categories, "
                   f"{result.outliers_found} outliers across {len(project_ids)} projects")
        
        return result


def global_result_to_dict(result: GlobalAnalysisResult) -> Dict[str, Any]:
    """Convert global result to serializable dict."""
    return {
        "project_ids": result.project_ids,
        "total_items": result.total_items,
        "categories_analyzed": result.categories_analyzed,
        "outliers_found": result.outliers_found,
        "computed_at": result.computed_at,
        "params_used": result.params_used,
        "project_stats": result.project_stats,
        "categories": [
            {
                "wbs6_code": cat.wbs6_code,
                "wbs6_description": cat.wbs6_description,
                "item_count": cat.item_count,
                "outlier_count": cat.outlier_count,
                "stats": {
                    "mean": cat.stats.mean,
                    "median": cat.stats.median,
                    "std": cat.stats.std,
                    "min": cat.stats.min,
                    "max": cat.stats.max,
                    "mad": cat.stats.mad
                } if cat.stats else None,
                "items": [
                    {
                        "item_id": item.item_id,
                        "code": item.code,
                        "description": item.description,
                        "unit": item.unit,
                        "actual_price": item.actual_price,
                        "estimated_price": item.estimated_price,
                        "confidence_band": list(item.confidence_band) if item.confidence_band else None,
                        "delta": item.delta,
                        "neighbors_count": item.neighbors_count,
                        "avg_similarity": item.avg_similarity,
                        "is_outlier": item.is_outlier,
                        "outlier_severity": item.outlier_severity,
                        "outlier_reason": item.outlier_reason,
                        "top_neighbors": item.top_neighbors
                    }
                    for item in cat.items
                ]
            }
            for cat in result.categories
        ]
    }

