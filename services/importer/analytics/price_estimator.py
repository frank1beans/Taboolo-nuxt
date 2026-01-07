"""
Price Estimator
===============
Estimates prices for items not in the price list using:
1. LLM property extraction from query text
2. Embedding-based semantic search
3. Property matching and scoring
4. Weighted price interpolation
"""

import os
import logging
from collections import Counter
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pymongo
from bson import ObjectId

from embedding import JinaEmbedder, get_embedder
from embedding.extraction.llm_extractor import LLMExtractor
from embedding.extraction.router import FamilyRouter

logger = logging.getLogger(__name__)


# =============================================================================
# Element type embeddings (semantic gating)
# =============================================================================

ELEMENT_TYPE_LABELS = {
    "pavimento": [
        "pavimento",
        "pavimenti",
        "posa pavimento",
        "piastrella pavimento",
        "gres porcellanato pavimento",
        "parquet",
    ],
    "parete": [
        "parete",
        "pareti",
        "tramezzo",
        "muratura interna",
        "parete in laterizio",
    ],
    "controsoffitto": [
        "controsoffitto",
        "controsoffitti",
        "soffitto sospeso",
        "soffitto in cartongesso",
    ],
    "massetto": [
        "massetto",
        "sottofondo",
        "massetto cementizio",
        "massetto autolivellante",
    ],
    "rivestimento": [
        "rivestimento",
        "rivestimenti",
        "rivestimento parete",
        "rivestimento ceramico",
    ],
    "cartongesso": [
        "cartongesso",
        "lastra di gesso rivestito",
        "parete in cartongesso",
        "controsoffitto in cartongesso",
    ],
    "serramenti": [
        "serramento",
        "infisso",
        "porta",
        "finestra",
        "vetrocamera",
    ],
    "coibentazione": [
        "coibentazione",
        "isolamento termico",
        "isolante",
        "lana di roccia",
    ],
    "impermeabilizzazione": [
        "impermeabilizzazione",
        "guaina bituminosa",
        "membrana impermeabile",
    ],
}

ELEMENT_TYPE_QUERY_MIN_SCORE = 0.35
ELEMENT_TYPE_QUERY_MIN_MARGIN = 0.05
ELEMENT_TYPE_ITEM_MIN_SCORE = 0.33
ELEMENT_TYPE_ITEM_MIN_MARGIN = 0.04


# =============================================================================
# Data Classes
# =============================================================================

@dataclass
class ExtractedProperty:
    """A single extracted property with confidence."""
    value: Any
    confidence: float
    evidence: Optional[str] = None


@dataclass
class PropertyMatch:
    """Match result for a single property."""
    name: str
    query_value: Any
    item_value: Any
    is_match: bool
    match_score: float  # 0-1, considers partial/interpolated matches


@dataclass
class SimilarItem:
    """A similar item from the database."""
    id: str
    code: str
    description: str
    price: float
    unit: str
    project_name: str
    similarity: float  # embedding similarity
    extracted_properties: Dict = field(default_factory=dict)  # Loaded in search, avoids N+1
    property_matches: List[PropertyMatch] = field(default_factory=list)
    combined_score: float = 0.0
    element_type: Optional[str] = None
    element_type_score: Optional[float] = None


@dataclass
class PriceEstimate:
    """The estimated price with confidence."""
    value: float
    range_low: float
    range_high: float
    confidence: float
    unit: str
    available_units: Dict[str, int] = field(default_factory=dict)
    method: str = "weighted_interpolation"


@dataclass
class EstimationResult:
    """Complete estimation result."""
    query: str
    extracted_properties: Dict[str, ExtractedProperty]
    estimated_price: Optional[PriceEstimate]
    similar_items: List[SimilarItem]
    error: Optional[str] = None


# =============================================================================
# Property Weights (configurable)
# =============================================================================

PROPERTY_WEIGHTS = {
    # Core properties - high importance
    "material": 0.8,
    "materiale": 0.8,
    "tipo": 0.7,
    "type": 0.7,
    
    # Cartongesso-specific - CRITICAL for pricing
    "frame_type": 0.9,          # doppia/singola orditura - HUGE price impact
    "board_layers": 0.8,        # numero strati lastra - significant impact
    "insulation_type": 0.7,     # tipo isolante
    "insulation_thickness_mm": 0.6,  # spessore isolante
    "fire_class": 0.5,          # classe fuoco (EI30, EI60, etc.)
    "acoustic_rating": 0.5,     # rating acustico
    
    # Dimensional properties - interpolatable
    "thickness_mm": 0.6,
    "spessore": 0.6,
    "spessore_mm": 0.6,
    "frame_thickness_mm": 0.5,  # spessore montante
    "frame_spacing_mm": 0.4,    # interasse montanti
    "format": 0.5,
    "formato": 0.5,
    "dimensions": 0.5,
    "dimensioni": 0.5,
    "width_mm": 0.4,
    "height_mm": 0.4,
    "larghezza": 0.4,
    "altezza": 0.4,
    
    # Brand/finish - lower importance
    "brand": 0.3,
    "marca": 0.3,
    "finish": 0.2,
    "finitura": 0.2,
    "color": 0.1,
    "colore": 0.1,
}

# Numeric properties that can be interpolated
NUMERIC_PROPERTIES = {
    "thickness_mm", "spessore", "spessore_mm",
    "width_mm", "height_mm", "larghezza", "altezza",
    "density", "densita", "weight", "peso",
}

# CRITICAL properties - items with mismatched values are EXCLUDED from price calculation
# These properties have such a large impact on price that mixing them would distort the estimate
CRITICAL_PROPERTIES = {
    "frame_type",      # singola vs doppia orditura - ~2x price difference
    "board_layers",    # 1 vs 2 vs 3 lastre - significant price impact
}

# =============================================================================
# Price Estimator
# =============================================================================

class PriceEstimator:
    """
    Estimates prices using semantic search + property interpolation.
    """
    _element_type_cache: Optional[Tuple[List[str], np.ndarray]] = None
    
    def __init__(
        self,
        db_uri: Optional[str] = None,
        embedding_weight: float = 0.4,
        property_weight: float = 0.6,
    ):
        self.db_uri = db_uri or os.getenv("MONGODB_URI", "mongodb://localhost:27017/test")
        self.embedding_weight = embedding_weight
        self.property_weight = property_weight
        self._client = None
        self._db = None
        self._embedder = None
        self._extractor = None
        self._family_router = None
    
    # -------------------------------------------------------------------------
    # Lazy initialization
    # -------------------------------------------------------------------------
    
    def _get_db(self):
        if self._db is None:
            self._client = pymongo.MongoClient(self.db_uri, connectTimeoutMS=30000)
            # Use explicit DB name from env, fallback to parsing URI or 'taboolo'
            db_name = os.getenv("MONGODB_DBNAME")
            if db_name:
                self._db = self._client[db_name]
            else:
                try:
                    self._db = self._client.get_database()
                except pymongo.errors.ConfigurationError:
                    self._db = self._client["taboolo"]
            logger.debug(f"Connected to database: {self._db.name}")
        return self._db
    
    def _get_collection(self, name: str):
        db = self._get_db()
        collections = db.list_collection_names()
        # Handle singular/plural naming
        if name in collections:
            return db[name]
        plural = name + "s"
        if plural in collections:
            return db[plural]
        # Log warning if collection doesn't exist
        logger.warning(f"Collection '{name}' not found, using anyway (will be created on write)")
        return db[name]
    
    # Context manager support
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
        return False
    
    def _get_embedder(self) -> JinaEmbedder:
        if self._embedder is None:
            self._embedder = get_embedder()
        return self._embedder
    
    def _get_extractor(self) -> LLMExtractor:
        if self._extractor is None:
            provider = os.getenv("EXTRACTION_LLM_PROVIDER", "mistral")
            model = os.getenv("EXTRACTION_LLM_MODEL", "mistral-large-latest")
            self._extractor = LLMExtractor(provider=provider, model=model)
        return self._extractor
    
    def _get_family_router(self) -> FamilyRouter:
        if self._family_router is None:
            self._family_router = FamilyRouter()
        return self._family_router

    def _normalize_vector(self, vector: List[float]) -> Optional[np.ndarray]:
        if not vector:
            return None
        vec = np.array(vector, dtype=np.float32)
        norm = np.linalg.norm(vec)
        if norm == 0:
            return None
        return vec / norm

    def _get_element_type_matrix(self) -> Optional[Tuple[List[str], np.ndarray]]:
        if PriceEstimator._element_type_cache is not None:
            return PriceEstimator._element_type_cache

        embedder = self._get_embedder()
        labels = []
        label_to_type = []
        for type_name, type_labels in ELEMENT_TYPE_LABELS.items():
            for label in type_labels:
                labels.append(label)
                label_to_type.append(type_name)

        embeddings = embedder.compute_embeddings(labels) if labels else []
        if not embeddings:
            logger.warning("Element type embeddings not available, skipping type gating.")
            return None

        type_vectors: Dict[str, List[np.ndarray]] = {key: [] for key in ELEMENT_TYPE_LABELS.keys()}
        for idx, vector in enumerate(embeddings):
            if vector is None:
                continue
            type_name = label_to_type[idx]
            type_vectors[type_name].append(np.array(vector, dtype=np.float32))

        types = []
        matrix = []
        for type_name, vectors in type_vectors.items():
            if not vectors:
                continue
            mean_vec = np.mean(vectors, axis=0)
            norm = np.linalg.norm(mean_vec)
            if norm == 0:
                continue
            types.append(type_name)
            matrix.append((mean_vec / norm).astype(np.float32))

        if not matrix:
            logger.warning("Element type embeddings computed empty, skipping type gating.")
            return None

        PriceEstimator._element_type_cache = (types, np.vstack(matrix))
        return PriceEstimator._element_type_cache

    def _classify_element_type(
        self,
        vector: List[float],
        min_score: float,
        min_margin: float,
    ) -> Optional[Tuple[str, float, float]]:
        cache = self._get_element_type_matrix()
        if not cache:
            return None
        types, matrix = cache
        vec = self._normalize_vector(vector)
        if vec is None or matrix.shape[1] != vec.shape[0]:
            return None

        scores = matrix.dot(vec)
        best_idx = int(np.argmax(scores))
        best_score = float(scores[best_idx])
        if len(scores) > 1:
            second_score = float(np.partition(scores, -2)[-2])
        else:
            second_score = -1.0

        if best_score < min_score or (best_score - second_score) < min_margin:
            return None
        return types[best_idx], best_score, second_score
    
    def close(self):
        if self._client:
            self._client.close()
            self._client = None
            self._db = None
    
    # -------------------------------------------------------------------------
    # Main estimation method
    # -------------------------------------------------------------------------
    
    def estimate(
        self,
        query: str,
        project_ids: Optional[List[str]] = None,
        top_k: int = 10,
        min_similarity: float = 0.4,
        unit: Optional[str] = None,
    ) -> EstimationResult:
        """
        Main estimation method.
        
        Args:
            query: Free text description of the item to estimate
            project_ids: Filter to specific projects (None = all)
            top_k: Number of similar items to consider
            min_similarity: Minimum embedding similarity threshold
            unit: Optional forced unit of measurement
        """
        logger.info(f"Estimating price for: {query[:50]}...")
        
        try:
            # 1. Extract properties from query
            extracted_props = self._extract_properties(query)
            logger.info(f"Extracted {len(extracted_props)} properties")
            
            # 2. Generate embedding for query
            embedder = self._get_embedder()
            query_embeddings = embedder.compute_embeddings([query])
            if not query_embeddings or query_embeddings[0] is None:
                return EstimationResult(
                    query=query,
                    extracted_properties=extracted_props,
                    estimated_price=None,
                    similar_items=[],
                    error="Failed to generate query embedding"
                )
            query_embedding = query_embeddings[0]

            # 3. Detect element type from embeddings (semantic gating)
            query_element = self._classify_element_type(
                query_embedding,
                min_score=ELEMENT_TYPE_QUERY_MIN_SCORE,
                min_margin=ELEMENT_TYPE_QUERY_MIN_MARGIN,
            )
            query_element_type = query_element[0] if query_element else None
            if query_element:
                logger.info(
                    "Detected element type: %s (score=%.3f)",
                    query_element[0],
                    query_element[1],
                )
            
            # 4. Search similar items
            candidates = self._search_similar_items(
                query_embedding, 
                project_ids, 
                limit=top_k * 3,  # Get more to filter
                min_similarity=min_similarity,
                query_element_type=query_element_type,
            )
            if not candidates and query_element_type:
                logger.info("No candidates after element type gating, retrying without type filter.")
                candidates = self._search_similar_items(
                    query_embedding,
                    project_ids,
                    limit=top_k * 3,
                    min_similarity=min_similarity,
                    query_element_type=None,
                )
            logger.info(f"Found {len(candidates)} candidate items")
            
            if not candidates:
                return EstimationResult(
                    query=query,
                    extracted_properties=extracted_props,
                    estimated_price=None,
                    similar_items=[],
                    error="No similar items found"
                )
            
            # 5. Score candidates by property match
            scored_items = self._score_by_properties(candidates, extracted_props)
            
            # 6. Take top_k after scoring
            top_items = sorted(scored_items, key=lambda x: x.combined_score, reverse=True)[:top_k]
            
            # 7. Interpolate price
            price_estimate = self._interpolate_price(top_items, extracted_props, target_unit=unit)
            
            return EstimationResult(
                query=query,
                extracted_properties=extracted_props,
                estimated_price=price_estimate,
                similar_items=top_items,
            )
            
        except Exception as e:
            logger.error(f"Estimation failed: {e}", exc_info=True)
            return EstimationResult(
                query=query,
                extracted_properties={},
                estimated_price=None,
                similar_items=[],
                error=str(e)
            )
    
    # -------------------------------------------------------------------------
    # Property extraction
    # -------------------------------------------------------------------------
    
    def _extract_properties(self, query: str) -> Dict[str, ExtractedProperty]:
        """Extract properties from query using LLM."""
        extractor = self._get_extractor()
        router = self._get_family_router()
        
        # Detect family for appropriate schema
        family = router.get_best_family(query, fallback="core")
        
        # Get schema template
        schema = self._get_schema_for_family(family)
        
        # Extract
        try:
            raw_result = extractor.extract(
                description=query,
                schema=schema,
                family=family,
            )
            
            # Convert to ExtractedProperty objects
            result = {}
            for key, slot in raw_result.items():
                if slot and isinstance(slot, dict):
                    value = slot.get("value")
                    if value is not None:
                        result[key] = ExtractedProperty(
                            value=value,
                            confidence=slot.get("confidence", 0.5),
                            evidence=slot.get("evidence")
                        )
            return result
            
        except Exception as e:
            logger.warning(f"Property extraction failed: {e}")
            return {}
    
    def _get_schema_for_family(self, family: str) -> Dict[str, Any]:
        """Get schema template for a family."""
        # Import dynamically to avoid circular deps
        try:
            from embedding.extraction.schemas.core import CoreProperties
            from embedding.extraction.schemas.pavimenti import PavimentiProperties
            from embedding.extraction.schemas.rivestimenti import RivestimentiProperties
            from embedding.extraction.schemas.cartongesso import CartongessoProperties
            from embedding.extraction.schemas.serramenti import SerramentiProperties
            
            schema_map = {
                "pavimenti": PavimentiProperties,
                "rivestimenti": RivestimentiProperties,
                "cartongesso": CartongessoProperties,
                "serramenti": SerramentiProperties,
            }
            
            schema_cls = schema_map.get(family, CoreProperties)
            schema_model = schema_cls()
            fields = getattr(schema_model, "model_fields", None) or getattr(schema_model, "__fields__", {})
            return {name: {"value": None, "evidence": None, "confidence": 0.0} for name in fields}
        except Exception as e:
            logger.warning(f"Failed to get schema for family {family}: {e}")
            # Return a minimal default schema
            return {
                "material": {"value": None, "evidence": None, "confidence": 0.0},
                "dimensions": {"value": None, "evidence": None, "confidence": 0.0},
                "thickness_mm": {"value": None, "evidence": None, "confidence": 0.0},
            }
    
    # -------------------------------------------------------------------------
    # Similarity search
    # -------------------------------------------------------------------------
    
    def _search_similar_items(
        self,
        query_embedding: List[float],
        project_ids: Optional[List[str]],
        limit: int = 30,
        min_similarity: float = 0.4,
        query_element_type: Optional[str] = None,
    ) -> List[SimilarItem]:
        """Search for similar items using embedding cosine similarity."""
        coll = self._get_collection("pricelistitem")
        
        # Build query
        match_query: Dict[str, Any] = {
            "embedding": {"$exists": True, "$type": "array"},
            "price": {"$exists": True, "$gt": 0},
        }
        
        # Filter by projects if specified
        if project_ids:
            or_conditions = []
            for pid in project_ids:
                try:
                    or_conditions.append({"project_id": ObjectId(pid)})
                except:
                    or_conditions.append({"project_id": pid})
            match_query["$or"] = or_conditions
        
        # Fetch items with embeddings
        projection = {
            "_id": 1,
            "project_id": 1,
            "code": 1,
            "description": 1,
            "long_description": 1,
            "extended_description": 1,
            "price": 1,
            "unit": 1,
            "embedding": 1,
            "extracted_properties": 1,
        }
        
        items = list(coll.find(match_query, projection).limit(5000))  # Cap for performance
        logger.info(f"Loaded {len(items)} items with embeddings")
        
        # Compute similarities
        query_vec = np.array(query_embedding, dtype=np.float32)
        query_norm = np.linalg.norm(query_vec)
        if query_norm == 0:
            return []
        
        # Get project names
        project_names = self._get_project_names(project_ids)
        
        results = []
        filtered_by_type = 0
        skipped_dim_mismatch = 0
        expected_dim = len(query_embedding)
        
        for item in items:
            emb = item.get("embedding")
            if not emb:
                continue
            if len(emb) != expected_dim:
                skipped_dim_mismatch += 1
                continue
            
            item_vec = np.array(emb, dtype=np.float32)
            item_norm = np.linalg.norm(item_vec)
            if item_norm == 0:
                continue
            
            similarity = float(np.dot(query_vec, item_vec) / (query_norm * item_norm))
            
            if similarity >= min_similarity:
                element_type = None
                element_type_score = None
                if query_element_type:
                    item_type = self._classify_element_type(
                        emb,
                        min_score=ELEMENT_TYPE_ITEM_MIN_SCORE,
                        min_margin=ELEMENT_TYPE_ITEM_MIN_MARGIN,
                    )
                    if item_type:
                        element_type = item_type[0]
                        element_type_score = item_type[1]
                        if element_type != query_element_type:
                            filtered_by_type += 1
                            continue

                pid_str = str(item.get("project_id", ""))
                # Extract properties here (avoids N+1 query later)
                item_props = item.get("extracted_properties") or {}
                results.append(SimilarItem(
                    id=str(item["_id"]),
                    code=item.get("code", ""),
                    description=item.get("description", "") or item.get("long_description", ""),
                    price=float(item.get("price", 0)),
                    unit=item.get("unit", ""),
                    project_name=project_names.get(pid_str, pid_str[:8]),
                    similarity=similarity,
                    extracted_properties=item_props,
                    element_type=element_type,
                    element_type_score=element_type_score,
                ))
        
        # Log if many items skipped due to dimension mismatch
        if skipped_dim_mismatch > 0:
            logger.warning(f"Skipped {skipped_dim_mismatch} items due to embedding dimension mismatch (expected {expected_dim})")
        if query_element_type and filtered_by_type > 0:
            logger.info("Filtered %d items due to element type mismatch (%s)", filtered_by_type, query_element_type)
        
        # Sort by similarity
        results.sort(key=lambda x: x.similarity, reverse=True)
        return results[:limit]
    
    def _get_project_names(self, project_ids: Optional[List[str]]) -> Dict[str, str]:
        """Get project name mapping."""
        coll = self._get_collection("project")
        
        query = {}
        if project_ids:
            or_conditions = []
            for pid in project_ids:
                try:
                    or_conditions.append({"_id": ObjectId(pid)})
                except:
                    pass
            if or_conditions:
                query["$or"] = or_conditions
        
        projects = list(coll.find(query, {"_id": 1, "name": 1, "code": 1}).limit(100))
        return {str(p["_id"]): p.get("name") or p.get("code", "") for p in projects}
    
    # -------------------------------------------------------------------------
    # Property scoring
    # -------------------------------------------------------------------------
    
    def _score_by_properties(
        self,
        items: List[SimilarItem],
        query_props: Dict[str, ExtractedProperty],
    ) -> List[SimilarItem]:
        """Score items by property match with query."""
        if not query_props:
            # No properties extracted, use only embedding similarity
            for item in items:
                item.combined_score = item.similarity
            return items
        
        for item in items:
            # Use extracted_properties already loaded in _search_similar_items (no N+1!)
            item_props = item.extracted_properties or {}
            
            # Calculate property match score
            total_weight = 0
            match_score = 0
            matches = []
            has_critical_mismatch = False
            
            for prop_name, query_prop in query_props.items():
                base_weight = PROPERTY_WEIGHTS.get(prop_name.lower(), 0.3)
                # Weight by extraction confidence (reduces impact of uncertain properties)
                confidence = query_prop.confidence if query_prop.confidence else 0.5
                weight = base_weight * confidence
                total_weight += weight
                
                item_slot = item_props.get(prop_name, {})
                item_value = item_slot.get("value") if isinstance(item_slot, dict) else item_slot
                
                # FALLBACK: If item doesn't have this property extracted, try to infer from description
                if item_value is None and item.description:
                    item_value = self._infer_property_from_description(prop_name, item.description)
                
                # Calculate match
                prop_match = self._match_property(prop_name, query_prop.value, item_value)
                match_score += weight * prop_match.match_score
                matches.append(prop_match)
                
                # CHECK FOR CRITICAL MISMATCH: if this is a critical property and values don't match,
                # mark the item for exclusion from price interpolation
                if prop_name.lower() in CRITICAL_PROPERTIES:
                    if item_value is not None and query_prop.value is not None:
                        # Both have values - check if they're incompatible
                        if not prop_match.is_match and prop_match.match_score < 0.5:
                            has_critical_mismatch = True
                            logger.debug(f"Critical mismatch: {prop_name}={query_prop.value} vs {item_value} in item {item.code}")
            
            # Normalize
            if total_weight > 0:
                property_score = match_score / total_weight
            else:
                property_score = 0
            
            # Combine scores
            item.property_matches = matches
            
            if has_critical_mismatch:
                # Mark for exclusion from price calculation (but still show in results)
                item.combined_score = -1.0  # Special marker
            else:
                item.combined_score = (
                    self.embedding_weight * item.similarity +
                    self.property_weight * property_score
                )
        
        return items
    
    def _infer_property_from_description(self, prop_name: str, description: str) -> Optional[Any]:
        """
        Fallback: infer property value from description text using patterns.
        Used when extracted_properties doesn't have this field.
        """
        desc_lower = description.lower()
        
        # Critical pattern matching for construction properties
        patterns = {
            "frame_type": [
                # Doppia orditura patterns - check specific first
                ("doppia orditura", "doppia orditura"),
                ("doppia struttura", "doppia orditura"),
                ("dw07", "doppia orditura"),  # Knauf DW07 = doppia orditura
                # Singola/mono orditura patterns
                ("singola orditura", "singola orditura"),
                ("singola struttura", "singola orditura"),
                ("mono orditura", "singola orditura"),
                ("mono struttura", "singola orditura"),
                # Generic patterns - less specific, check last
                ("doppia", "doppia orditura"),
                ("singola", "singola orditura"),
                ("mono", "singola orditura"),
            ],
            "board_layers": [
                ("doppia lastra", 2),
                ("2 lastre", 2),
                ("due lastre", 2),
                ("tripla lastra", 3),
                ("3 lastre", 3),
                ("lastra singola", 1),
                ("1 lastra", 1),
            ],
            "insulation_type": [
                ("lana minerale", "lana minerale"),
                ("lana di roccia", "lana di roccia"),
                ("lana di vetro", "lana di vetro"),
                ("eps", "EPS"),
                ("xps", "XPS"),
                ("polistirene", "polistirene"),
            ],
        }
        
        prop_patterns = patterns.get(prop_name.lower(), [])
        for pattern, value in prop_patterns:
            if pattern in desc_lower:
                return value
        
        return None
    
    def _match_property(
        self,
        name: str,
        query_value: Any,
        item_value: Any,
    ) -> PropertyMatch:
        """Calculate match score for a single property."""
        if item_value is None:
            return PropertyMatch(name=name, query_value=query_value, item_value=None, 
                                is_match=False, match_score=0.0)
        
        # Exact match
        if query_value == item_value:
            return PropertyMatch(name=name, query_value=query_value, item_value=item_value,
                                is_match=True, match_score=1.0)
        
        # Numeric interpolation
        if name.lower() in NUMERIC_PROPERTIES:
            try:
                q_num = float(query_value) if not isinstance(query_value, (int, float)) else query_value
                i_num = float(item_value) if not isinstance(item_value, (int, float)) else item_value
                
                # Score based on relative difference
                diff_ratio = abs(q_num - i_num) / max(q_num, i_num, 1)
                score = max(0, 1 - diff_ratio)  # 0% diff = 1.0, 100% diff = 0.0
                
                return PropertyMatch(name=name, query_value=query_value, item_value=item_value,
                                    is_match=score > 0.8, match_score=score)
            except (ValueError, TypeError):
                pass
        
        # String partial match
        if isinstance(query_value, str) and isinstance(item_value, str):
            q_lower = query_value.lower()
            i_lower = item_value.lower()
            if q_lower in i_lower or i_lower in q_lower:
                return PropertyMatch(name=name, query_value=query_value, item_value=item_value,
                                    is_match=True, match_score=0.7)
        
        # No match
        return PropertyMatch(name=name, query_value=query_value, item_value=item_value,
                            is_match=False, match_score=0.0)
    
    # -------------------------------------------------------------------------
    # Price interpolation
    # -------------------------------------------------------------------------
    
    def _interpolate_price(
        self,
        items: List[SimilarItem],
        query_props: Dict[str, ExtractedProperty],
        target_unit: Optional[str] = None,
    ) -> Optional[PriceEstimate]:
        """Interpolate price from similar items."""
        if not items:
            return None
        
        # FILTER: Exclude items with critical mismatch (combined_score = -1)
        valid_items = [item for item in items if item.combined_score >= 0 and item.price > 0]
        
        if not valid_items:
            # Fallback: if all items have critical mismatch, use all with positive price
            logger.warning("All items have critical mismatch, using fallback")
            valid_items = [item for item in items if item.price > 0]
        
        if not valid_items:
            return None
        

        
        # Get most common unit from valid items only
        all_units = [item.unit for item in valid_items if item.unit]
        
        if not all_units:
            return None
            
        unit_counts = Counter(all_units)
        available_units = dict(unit_counts)
        
        # Determine target unit
        if target_unit and target_unit in available_units:
            unit = target_unit
        else:
            # Default to most common
            unit = unit_counts.most_common(1)[0][0]
            
        # FILTER: Only use items with the selected unit for the average
        unit_items = [item for item in valid_items if item.unit == unit]
        
        if not unit_items:
             # Should not happen given logic above, but safety check
            return None

        prices = [item.price for item in unit_items]
        weights = [max(item.combined_score, 0.1) for item in unit_items]  # Ensure positive weights
        
        # Weighted average
        total_weight = sum(weights)
        if total_weight == 0:
            estimated = float(np.median(prices))
        else:
            estimated = sum(p * w for p, w in zip(prices, weights)) / total_weight
        
        # Calculate range (use percentiles)
        prices_arr = np.array(prices)
        if len(prices) > 1:
            range_low = float(np.percentile(prices_arr, 25))
            range_high = float(np.percentile(prices_arr, 75))
        else:
            range_low = float(prices[0])
            range_high = float(prices[0])
        
        # Confidence based on consistency
        if len(prices) >= 3:
            cv = float(np.std(prices_arr) / np.mean(prices_arr)) if np.mean(prices_arr) > 0 else 1
            confidence = max(0.3, min(0.95, 1 - cv))  # Lower CV = higher confidence
        else:
            confidence = 0.5

        return PriceEstimate(
            value=round(estimated, 2),
            range_low=round(range_low, 2),
            range_high=round(range_high, 2),
            confidence=round(confidence, 2),
            unit=unit,
            available_units=available_units,
        )

