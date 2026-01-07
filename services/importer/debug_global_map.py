import sys
import os
import logging
from bson import ObjectId

# Add current directory to path
sys.path.append(os.getcwd())

from dotenv import load_dotenv
load_dotenv(".env")


# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    from analytics.price_analysis import GlobalPriceAnalyzer
except ImportError as e:
    logger.error(f"ImportError: {e}")
    sys.exit(1)
except Exception as e:
    logger.error(f"Error during import: {e}")
    sys.exit(1)

def test_fetch_projects():
    logger.info("Initializing GlobalPriceAnalyzer...")
    try:
        analyzer = GlobalPriceAnalyzer()
        logger.info("Fetching projects...")
        projects = analyzer.fetch_projects()
        logger.info(f"Fetched {len(projects)} projects.")
        
        if projects:
            project_ids = [str(p["_id"]) for p in projects]
            logger.info(f"Fetching items for projects: {project_ids}")
            
            # Helper to mock logic in endpoint
            coll = analyzer._get_collection("pricelistitem")
            or_conditions = []
            for pid in project_ids:
                try:
                    oid = ObjectId(pid)
                    or_conditions.append({"project_id": oid})
                except:
                    or_conditions.append({"project_id": pid})
            
            wbs_coll = analyzer._get_collection("wbsnode")
            logger.info(f"PriceListItem Collection: {coll.name}")
            logger.info(f"WBSNode Collection: {wbs_coll.name}")
            
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
                        "long_description": 1,
                        "extended_description": 1,
                        "price": 1,
                        "unit": 1,
                        "map2d": 1,
                        "map3d": 1,
                        "cluster": 1,
                        "map_version": 1,
                        "map_updated_at": 1,
                        "wbs06_node": {
                            "$filter": {
                                "input": "$wbs_nodes",
                                "as": "wbs",
                                "cond": {
                                    "$or": [
                                        {
                                            "$regexMatch": {
                                                "input": {"$ifNull": ["$$wbs.type", ""]},
                                                "regex": "WBS 0?6",
                                                "options": "i"
                                            }
                                        },
                                        { "$eq": ["$$wbs.level", 6] }
                                    ]
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
            
            logger.info("Running aggregation pipeline (FULL)...")
            items = list(coll.aggregate(pipeline))
            logger.info(f"Aggregation returned {len(items)} items.")

            # Simulate latest_map_updated logic (Potential crash point?)
            logger.info("Calculating latest map version...")
            latest_map_updated = None
            latest_map_version = None
            for item in items:
                updated_at = item.get("map_updated_at")
                if updated_at and (latest_map_updated is None or updated_at > latest_map_updated):
                    latest_map_updated = updated_at
                    latest_map_version = item.get("map_version")
            
            logger.info(f"Latest version: {latest_map_version}, Updated: {latest_map_updated}")
            
            if latest_map_updated:
                try:
                    logger.info(f"ISO Format: {latest_map_updated.isoformat()}")
                except Exception as e:
                    logger.error(f"ISO Format failed: {e}")

            # Simulate post-processing
            project_names = {str(p["_id"]): p.get("name", p.get("code", "")) for p in projects}
            points = []
            
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
                    "long_description": item.get("long_description") or item.get("extended_description") or "",
                    "code": item.get("code", ""),
                    "price": item.get("price"),
                    "unit": item.get("unit", ""),
                    "wbs06": item.get("wbs06", ""),
                    "wbs06_desc": item.get("wbs06_desc", "")
                })
            
            logger.info(f"Generated {len(points)} points.")

            # Simulate project_info generation (Potential crash point?)
            logger.info("Generating project info...")
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
            logger.info(f"Generated info for {len(project_info)} projects.")
            
        analyzer.close()
        logger.info("Test passed.")
    except Exception as e:
        logger.exception("Test failed with exception:")

if __name__ == "__main__":
    test_fetch_projects()
