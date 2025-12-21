
import logging
import os
import time
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
import numpy as np
from datetime import datetime, timezone
from bson import ObjectId

# Conditional imports to avoid hard crashes if libs are missing during dev
try:
    import umap
except ImportError:
    umap = None

try:
    import hdbscan
except ImportError:
    hdbscan = None

# from core.database import get_db # Removed to fix ImportError
import pymongo
from pymongo import UpdateOne
from logic.embedding import get_embedder

logger = logging.getLogger(__name__)

router = APIRouter()

# --- Schemas ---

class ComputeMapRequest(BaseModel):
    projectId: str
    force: bool = False

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

# --- Logic ---

def _run_compute_map_job(project_id: str):
    """
    Background job to compute UMAP (2D/3D) and Clusters.
    """
    if not umap or not hdbscan:
        logger.error("UMAP or HDBSCAN libraries not installed. Skipping compute job.")
        return

    start_time = time.time()
    logger.info(f"Starting Semantic Map computation for Project {project_id}")

    # 1. Connect to DB
    # We use a direct new connection for thread safety / simple blocking I/O in this job
    
    mongo_uri = os.getenv("MONGODB_URI") 
    if not mongo_uri:
         logger.warning("MONGODB_URI not found in env, using localhost default.")
         mongo_uri = "mongodb://localhost:27017/test"
         
    # Increase connection timeout for slow DNS
    client = pymongo.MongoClient(mongo_uri, connectTimeoutMS=30000, socketTimeoutMS=None)

    try:
        db = client.get_database()
    except pymongo.errors.ConfigurationError:
        db = client.get_database("test")
    
    # DEBUG: List collections to be sure
    logger.info(f"Connected to DB: {db.name}")
    logger.info(f"Available Collections: {db.list_collection_names()}")

    # User said "pricelistitem" (singular) collection.
    # We will try both or prioritize user suggestion.
    if "pricelistitem" in db.list_collection_names():
        coll = db.pricelistitem
        logger.info("Using 'pricelistitem' collection.")
    elif "pricelistitems" in db.list_collection_names():
        coll = db.pricelistitems
        logger.info("Using 'pricelistitems' collection.")
    else:
        logger.warning("Could not find 'pricelistitem' or 'pricelistitems' collection. Using 'pricelistitem' default.")
        coll = db.pricelistitem
    
    # User said "embeddings" (plural) field.
    # We'll check the first document to verify the field name if possible, or support both.
    
    # DEBUG: Probe collection to see one document
    sample_doc = coll.find_one()
    if sample_doc:
        logger.info(f"Sample Document Keys: {list(sample_doc.keys())}")
        if "project_id" in sample_doc:
            logger.info(f"Sample project_id type: {type(sample_doc['project_id'])} Value: {sample_doc['project_id']}")
        else:
            logger.warning("Sample document missing 'project_id' field!")
            
        if "embedding" in sample_doc:
             logger.info("Found 'embedding' field.")
        if "embeddings" in sample_doc:
             logger.info("Found 'embeddings' field.")
    else:
        logger.warning("Collection appears empty or no documents found.")

    # Filter by project_id. 
    # Note: If PriceListItem doesn't have project_id, users might be relying on a separate structure.
    # We will trust the user Input that "project_id" exists on these docs.
    
    # Try singular 'embedding' first, then 'embeddings'
    embedding_field = "embedding" 
    
    # Probing one doc for embedding field
    if sample_doc:
        if "embeddings" in sample_doc and "embedding" not in sample_doc:
            embedding_field = "embeddings"
            logger.info("Detected 'embeddings' field (plural).")
        else:
            logger.info("Detected 'embedding' field (singular) or default.")
    
    # Fix ProjectId lookup type (ObjectId vs Str)
    # The log showed project_id is an ObjectId. We receive string.
    try:
        project_oid = ObjectId(project_id)
        query = {"project_id": project_oid, embedding_field: {"$type": "array"}}
    except Exception:
        logger.warning(f"Could not cast project_id {project_id} to ObjectId. Trying as string.")
        query = {"project_id": project_id, embedding_field: {"$type": "array"}}

    # Projection
    projection = {embedding_field: 1}
    
    docs = list(coll.find(query, projection))
    logger.info(f"Found {len(docs)} items with embeddings for project {project_id}")
    
    if len(docs) < 5:
        logger.warning("Not enough items to compute UMAP (<5). Aborting.")
        client.close()
        return

    # 2. Prepare Data
    ids = []
    vectors = []
    for d in docs:
        emb = d.get(embedding_field)
        if emb and len(emb) == 1024: # Check dimensions
            ids.append(d["_id"])
            vectors.append(emb)

    if not ids:
        logger.warning("No valid vectors found.")
        client.close()
        return

    X = np.array(vectors, dtype=np.float32)
    n_samples = len(X)
    
    # 3. Clustering (HDBSCAN)
    # min_cluster_size: dynamic
    min_size = max(5, int(n_samples / 50))
    logger.info(f"Running HDBSCAN (min_cluster_size={min_size})...")
    clusterer = hdbscan.HDBSCAN(min_cluster_size=min_size, min_samples=1)
    clusters = clusterer.fit_predict(X)
    
    # 4. UMAP 2D
    logger.info("Running UMAP 2D...")
    reducer_2d = umap.UMAP(
        n_components=2, 
        n_neighbors=min(30, n_samples - 1), 
        min_dist=0.0,
        metric="cosine", 
        random_state=42
    )
    embedding_2d = reducer_2d.fit_transform(X)
    
    # 5. UMAP 3D
    logger.info("Running UMAP 3D...")
    reducer_3d = umap.UMAP(
        n_components=3, 
        n_neighbors=min(30, n_samples - 1), 
        min_dist=0.0, 
        metric="cosine", 
        random_state=42
    )
    embedding_3d = reducer_3d.fit_transform(X)
    
    # 6. Bulk Update
    logger.info("Preparing Bulk Update...")
    now = datetime.now(timezone.utc)
    map_version = f"{project_id}_v1_{int(time.time())}"
    
    ops = []
    for _id, (x2, y2), (x3, y3, z3), c in zip(ids, embedding_2d, embedding_3d, clusters):
        ops.append(UpdateOne(
            {"_id": _id},
            {"$set": {
                "map2d": {"x": float(x2), "y": float(y2)},
                "map3d": {"x": float(x3), "y": float(y3), "z": float(z3)},
                "cluster": int(c),
                "map_version": map_version,
                "map_updated_at": now
            }}
        ))
        
    if ops:
        res = coll.bulk_write(ops, ordered=False)
        logger.info(f"Bulk write finished. Modified: {res.modified_count}")
    
    client.close()
    elapsed = time.time() - start_time
    logger.info(f"Compute job finished in {elapsed:.2f}s")


# --- Endpoints ---

@router.post("/compute-map")
async def trigger_compute_map(payload: ComputeMapRequest, background_tasks: BackgroundTasks):
    """
    Triggers the background calculation of UMAP and Clusters.
    """
    if not umap:
        raise HTTPException(status_code=500, detail="UMAP library not installed on server.")
    
    background_tasks.add_task(_run_compute_map_job, payload.projectId)
    return {"status": "accepted", "message": "Computation started in background"}


class GlobalComputeMapRequest(BaseModel):
    """Request for global UMAP computation."""
    project_ids: Optional[List[str]] = None  # None = all projects
    force: bool = False


def _run_global_compute_map_job(project_ids: Optional[List[str]] = None):
    """
    Background job to compute UMAP (2D/3D) and Clusters on ALL items across ALL projects.
    This ensures all points are placed in the same semantic space for proper comparison.
    """
    if not umap or not hdbscan:
        logger.error("UMAP or HDBSCAN libraries not installed. Skipping compute job.")
        return

    start_time = time.time()
    logger.info(f"Starting GLOBAL Semantic Map computation for projects: {project_ids or 'ALL'}")

    # 1. Connect to DB
    mongo_uri = os.getenv("MONGODB_URI") 
    if not mongo_uri:
        logger.warning("MONGODB_URI not found in env, using localhost default.")
        mongo_uri = "mongodb://localhost:27017/test"
         
    client = pymongo.MongoClient(mongo_uri, connectTimeoutMS=30000, socketTimeoutMS=None)

    try:
        db = client.get_database()
    except pymongo.errors.ConfigurationError:
        db = client.get_database("test")
    
    logger.info(f"Connected to DB: {db.name}")

    # Get collection
    if "pricelistitem" in db.list_collection_names():
        coll = db.pricelistitem
    elif "pricelistitems" in db.list_collection_names():
        coll = db.pricelistitems
    else:
        coll = db.pricelistitem
    
    # Detect embedding field
    sample_doc = coll.find_one()
    embedding_field = "embedding"
    if sample_doc and "embeddings" in sample_doc and "embedding" not in sample_doc:
        embedding_field = "embeddings"
    
    # 2. Build query for items with embeddings
    query: Dict[str, Any] = {embedding_field: {"$type": "array"}}
    
    # Filter by project_ids if provided
    if project_ids:
        or_conditions = []
        for pid in project_ids:
            try:
                oid = ObjectId(pid)
                or_conditions.append({"project_id": oid})
            except:
                or_conditions.append({"project_id": pid})
        query["$or"] = or_conditions
    
    # Fetch all items with embeddings
    projection = {"_id": 1, "project_id": 1, embedding_field: 1}
    docs = list(coll.find(query, projection))
    logger.info(f"Found {len(docs)} total items with embeddings")
    
    if len(docs) < 5:
        logger.warning("Not enough items to compute UMAP (<5). Aborting.")
        client.close()
        return

    # 3. Prepare Data - collect all vectors
    ids = []
    vectors = []
    for d in docs:
        emb = d.get(embedding_field)
        if emb and len(emb) == 1024:  # Check dimensions
            ids.append(d["_id"])
            vectors.append(emb)

    if len(ids) < 5:
        logger.warning(f"Only {len(ids)} valid vectors found. Not enough for UMAP.")
        client.close()
        return

    X = np.array(vectors, dtype=np.float32)
    n_samples = len(X)
    logger.info(f"Processing {n_samples} vectors for global UMAP")
    
    # 4. Clustering (HDBSCAN) on all data
    min_size = max(5, int(n_samples / 50))
    logger.info(f"Running HDBSCAN (min_cluster_size={min_size})...")
    clusterer = hdbscan.HDBSCAN(min_cluster_size=min_size, min_samples=1)
    clusters = clusterer.fit_predict(X)
    n_clusters = len(set(clusters)) - (1 if -1 in clusters else 0)
    logger.info(f"Found {n_clusters} clusters")
    
    # 5. UMAP 2D on all data
    logger.info("Running UMAP 2D on all embeddings...")
    n_neighbors = min(30, n_samples - 1)
    reducer_2d = umap.UMAP(
        n_components=2, 
        n_neighbors=n_neighbors, 
        min_dist=0.0,
        metric="cosine", 
        random_state=42
    )
    embedding_2d = reducer_2d.fit_transform(X)
    
    # 6. UMAP 3D on all data
    logger.info("Running UMAP 3D on all embeddings...")
    reducer_3d = umap.UMAP(
        n_components=3, 
        n_neighbors=n_neighbors, 
        min_dist=0.0, 
        metric="cosine", 
        random_state=42
    )
    embedding_3d = reducer_3d.fit_transform(X)
    
    # 7. Bulk Update all items
    logger.info("Preparing Bulk Update for all items...")
    now = datetime.now(timezone.utc)
    map_version = f"global_v1_{int(time.time())}"
    
    ops = []
    for _id, (x2, y2), (x3, y3, z3), c in zip(ids, embedding_2d, embedding_3d, clusters):
        ops.append(UpdateOne(
            {"_id": _id},
            {"$set": {
                "map2d": {"x": float(x2), "y": float(y2)},
                "map3d": {"x": float(x3), "y": float(y3), "z": float(z3)},
                "cluster": int(c),
                "map_version": map_version,
                "map_updated_at": now
            }}
        ))
        
    if ops:
        # Process in batches for large datasets
        batch_size = 1000
        total_modified = 0
        for i in range(0, len(ops), batch_size):
            batch = ops[i:i+batch_size]
            res = coll.bulk_write(batch, ordered=False)
            total_modified += res.modified_count
            logger.info(f"Bulk write batch {i//batch_size + 1}: modified {res.modified_count}")
        
        logger.info(f"Total modified: {total_modified}")
    
    client.close()
    elapsed = time.time() - start_time
    logger.info(f"Global compute job finished in {elapsed:.2f}s - processed {n_samples} items")


@router.post("/global/compute-map")
async def trigger_global_compute_map(payload: GlobalComputeMapRequest, background_tasks: BackgroundTasks):
    """
    Triggers UMAP computation for ALL items across multiple projects.
    All embeddings are processed together so points from different projects
    are placed in the same semantic space for proper comparison.
    """
    if not umap:
        raise HTTPException(status_code=500, detail="UMAP library not installed on server.")
    
    from logic.price_analysis import GlobalPriceAnalyzer
    
    analyzer = GlobalPriceAnalyzer()
    projects = analyzer.fetch_projects(project_ids=payload.project_ids)
    analyzer.close()
    
    if not projects:
        raise HTTPException(status_code=404, detail="No projects found")
    
    project_ids = [str(p["_id"]) for p in projects]
    
    # Single background task that processes ALL projects together
    background_tasks.add_task(_run_global_compute_map_job, project_ids)
    
    return {
        "status": "accepted", 
        "message": f"Global UMAP computation started for {len(project_ids)} projects (all embeddings processed together)",
        "project_count": len(project_ids)
    }

@router.post("/search")
async def semantic_search(payload: SearchRequest):
    """
    Performs vector search using Atlas Vector Search ($vectorSearch).
    Returns list of matching IDs and scores.
    """
    embedder = get_embedder()
    query_vector_list = embedder.compute_embeddings([payload.query])
    
    if not query_vector_list or query_vector_list[0] is None:
        raise HTTPException(status_code=500, detail="Failed to generate embedding for query")
        
    query_vector = query_vector_list[0]
    
    # Connect to DB (async? or sync for now inside this route)
    # Using sync pymongo for simplicity here as we are inside a standard def (running in threadpool)
    # unless using `async def` with `motor`. 
    # Let's stick to standard pymongo for quick implementation unless `core.database` offers async.
    
    mongo_uri = os.getenv("MONGODB_URI") 
    if not mongo_uri:
         logger.warning("MONGODB_URI not found in env, using localhost default.")
         mongo_uri = "mongodb://localhost:27017/test"

    client = pymongo.MongoClient(mongo_uri, connectTimeoutMS=30000, socketTimeoutMS=None)
    try:
        db = client.get_database()
    except pymongo.errors.ConfigurationError:
        db = client.get_database("test")

    # Dynamic Collection Logic
    if "pricelistitem" in db.list_collection_names():
        coll = db.pricelistitem
    elif "pricelistitems" in db.list_collection_names():
        coll = db.pricelistitems
    else:
        coll = db.pricelistitem

    # Dynamic Field Logic (Simple heuristic)
    # We just assume 'embedding' for vector search path unless we want to query a doc first.
    # The user said "embeddings" plural, but Vector Search index configuration MUST match the path.
    # If the user changed the field name, they likely changed the index definition too.
    # We will assume 'embeddings' if the collection name was 'pricelistitem' (heuristic) or check a doc.
    
    embedding_path = "embedding"
    probe = coll.find_one()
    if probe and "embeddings" in probe:
         embedding_path = "embeddings"
    
    # Pipeline
    # Using 'vector_index' as confirmed/assumed.
    pipeline = [
        {
            "$vectorSearch": {
                "index": "vector_index", 
                "path": embedding_path,
                "queryVector": query_vector,
                "numCandidates": 100,
                "limit": payload.limit
            }
        },
        {
            "$project": {
                "_id": 1,
                "code": 1,
                "description": 1,
                "score": { "$meta": "vectorSearchScore" }
            }
        }
    ]
    
    # Optional Filter by ProjectId
    # Atlas Vector Search supports 'filter' inside $vectorSearch but it requires the field to be indexed as a filter.
    # If not indexed, we can match afterwards (less efficient) or hope the user indexed 'project_id'.
    # For now, we'll try to add filter if user indexed it.
        
    # FIX: project_id might need to be ObjectId if stored as ObjectId
    # FIX: Atlas Vector Search 'filter' requires index configuration.
    # Falling back to post-filtering (less efficient but works without index changes).
    if payload.projectId:
        # Match stage AFTER vector search
        pipeline.insert(1, { "$match": { "project_id": payload.projectId } })  # Use string or ObjectId depending on DB type
        
        # Better: Try to match both string and ObjectId to be safe?
        # For now, let's assume the earlier discovery holds true (ObjectId in DB).
        try:
             pid_obj = ObjectId(payload.projectId)
             pipeline[1]["$match"] = { 
                 "$or": [
                     {"project_id": payload.projectId}, 
                     {"project_id": pid_obj}
                 ] 
             }
        except:
             pass
        
    try:
        results = list(coll.aggregate(pipeline))
        # Convert ObjectId to str
        for r in results:
            r["id"] = str(r["_id"])
            del r["_id"]
            
        return results
    except Exception as e:
        logger.error(f"Vector search failed: {e}")
        # Build strict fallback if filter is not indexed?
        # Re-raise for now.
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        client.close()


# --- Price Analysis Endpoint ---

@router.post("/price-analysis/{project_id}")
async def run_price_analysis(project_id: str, params: PriceAnalysisRequest = PriceAnalysisRequest()):
    """
    Run batch price analysis for a project.
    Returns fair price estimates and outlier flags per WBS06 category.
    """
    from logic.price_analysis import PriceAnalyzer, AnalysisParams, result_to_dict
    
    logger.info(f"Starting price analysis for project {project_id}")
    
    try:
        analyzer = PriceAnalyzer()
        
        analysis_params = AnalysisParams(
            top_k=params.top_k,
            min_similarity=params.min_similarity,
            mad_threshold=params.mad_threshold,
            min_category_size=params.min_category_size,
            estimation_method=params.estimation_method,
            wbs6_filter=params.wbs6_filter,
            include_neighbors=params.include_neighbors
        )
        
        result = analyzer.analyze_project(project_id, analysis_params)
        analyzer.close()
        
        return result_to_dict(result)
        
    except Exception as e:
        logger.error(f"Price analysis failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# --- Global Multi-Project Endpoints ---

@router.post("/global/price-analysis")
async def run_global_price_analysis(params: GlobalAnalysisRequest = GlobalAnalysisRequest()):
    """
    Run global price analysis across multiple projects.
    Returns aggregated analysis by WBS06 category across selected projects.
    """
    from logic.price_analysis import GlobalPriceAnalyzer, GlobalAnalysisParams, global_result_to_dict
    
    logger.info(f"Starting global price analysis")
    logger.info(f"Filters: projects={params.project_ids}, year={params.year}, bu={params.business_unit}")
    
    try:
        analyzer = GlobalPriceAnalyzer()
        
        analysis_params = GlobalAnalysisParams(
            project_ids=params.project_ids,
            year=params.year,
            business_unit=params.business_unit,
            top_k=params.top_k,
            min_similarity=params.min_similarity,
            mad_threshold=params.mad_threshold,
            min_category_size=params.min_category_size,
            estimation_method=params.estimation_method,
            wbs6_filter=params.wbs6_filter,
            include_neighbors=params.include_neighbors
        )
        
        result = analyzer.analyze_global(analysis_params)
        analyzer.close()
        
        return global_result_to_dict(result)
        
    except Exception as e:
        logger.error(f"Global price analysis failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/global/map-data")
async def get_global_map_data(params: GlobalAnalysisRequest = GlobalAnalysisRequest()):
    """
    Fetch semantic map data for multiple projects.
    Returns points with UMAP coordinates and cluster info.
    """
    from logic.price_analysis import GlobalPriceAnalyzer
    
    logger.info(f"Fetching global map data")
    
    try:
        analyzer = GlobalPriceAnalyzer()
        
        # Fetch projects matching filters
        projects = analyzer.fetch_projects(
            project_ids=params.project_ids,
            year=params.year,
            business_unit=params.business_unit
        )
        
        if not projects:
            return {"points": [], "projects": []}
        
        project_ids = [str(p["_id"]) for p in projects]
        
        # Fetch items with map coordinates
        coll = analyzer._get_collection("pricelistitem")
        
        or_conditions = []
        for pid in project_ids:
            try:
                oid = ObjectId(pid)
                or_conditions.append({"project_id": oid})
            except:
                or_conditions.append({"project_id": pid})
        
        # Use aggregation pipeline with $lookup to get WBS06 codes
        wbs_coll = analyzer._get_collection("wbsnode")
        
        pipeline = [
            {
                "$match": {
                    "$or": or_conditions,
                    "map2d": {"$exists": True}
                }
            },
            {
                "$lookup": {
                    "from": "wbsnodes",
                    "localField": "wbs_ids",
                    "foreignField": "_id",
                    "as": "wbs_nodes"
                }
            },
            {
                "$project": {
                    "_id": 1,
                    "project_id": 1,
                    "code": 1,
                    "description": 1,
                    "price": 1,
                    "unit": 1,
                    "map2d": 1,
                    "map3d": 1,
                    "cluster": 1,
                    "wbs06_node": {
                        "$filter": {
                            "input": "$wbs_nodes",
                            "as": "wbs",
                            "cond": {
                                "$regexMatch": {
                                    "input": {"$ifNull": ["$$wbs.type", ""]},
                                    "regex": "WBS 0?6",
                                    "options": "i"
                                }
                            }
                        }
                    }
                }
            },
            {
                "$addFields": {
                    "wbs06": {
                        "$ifNull": [
                            {"$arrayElemAt": ["$wbs06_node.code", 0]},
                            ""
                        ]
                    },
                    "wbs06_desc": {
                        "$ifNull": [
                            {"$arrayElemAt": ["$wbs06_node.description", 0]},
                            ""
                        ]
                    }
                }
            },
            {
                "$project": {
                    "wbs_nodes": 0,
                    "wbs06_node": 0
                }
            }
        ]
        
        items = list(coll.aggregate(pipeline))
        
        analyzer.close()
        
        # Build points array
        points = []
        project_names = {str(p["_id"]): p.get("name", p.get("code", "")) for p in projects}
        
        for item in items:
            map2d = item.get("map2d", {})
            map3d = item.get("map3d", {})
            
            if not map2d or map2d.get("x") is None:
                continue
            
            pid_str = str(item.get("project_id", ""))
            
            points.append({
                "id": str(item["_id"]),
                "project_id": pid_str,
                "project_name": project_names.get(pid_str, ""),
                "x": map2d.get("x", 0),
                "y": map2d.get("y", 0),
                "z": map3d.get("z", 0) if map3d else 0,
                "cluster": item.get("cluster", 0),
                "label": item.get("description", "")[:100],
                "code": item.get("code", ""),
                "price": item.get("price"),
                "unit": item.get("unit", ""),
                "wbs06": item.get("wbs06", ""),
                "wbs06_desc": item.get("wbs06_desc", "")
            })
        
        # Project info for filters
        project_info = [
            {
                "id": str(p["_id"]),
                "name": p.get("name", ""),
                "code": p.get("code", ""),
                "business_unit": p.get("business_unit", ""),
                "year": p.get("created_at").year if p.get("created_at") else None
            }
            for p in projects
        ]
        
        logger.info(f"Returning {len(points)} points from {len(projects)} projects")
        
        return {
            "points": points,
            "projects": project_info
        }
        
    except Exception as e:
        logger.error(f"Global map data failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

