
import os
import pymongo
from bson import ObjectId
from dotenv import load_dotenv
from pathlib import Path

# Load .env from root (Taboolo-nuxt/.env)
env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(env_path)

def debug_wbs():
    mongo_uri = os.getenv("MONGODB_URI")
    if not mongo_uri and "mongodb+srv" not in str(os.environ):
         # Fallback to user provided URI if env is empty
         mongo_uri = "mongodb+srv://francescobiggi12:!!Kombucha3416@cluster0.mp0kxea.mongodb.net/?appName=Cluster0"
    
    print(f"Connecting to URI...")
    client = pymongo.MongoClient(mongo_uri)
    print("Databases available:", client.list_database_names())
    
    # Heuristic to pick DB
    dbs = client.list_database_names()
    target_db = "test" if "test" in dbs else dbs[0]
    if "admin" in dbs and target_db == "admin" and len(dbs) > 1:
        target_db = dbs[1] # Skip admin/local if possible
        
    print(f"Selecting DB: {target_db}")
    db = client.get_database(target_db)
    
    if "pricelistitem" in db.list_collection_names():
        coll = db.pricelistitem
    else:
        coll = db.pricelistitems
        
    # Find one item that has wbs_ids
    doc = coll.find_one({"wbs_ids": {"$exists": True, "$not": {"$size": 0}}})
    if not doc:
        print("No items with wbs_ids found.")
        return

    print(f"Inspecting item: {doc.get('description')} (ID: {doc['_id']})")
    print(f"WBS IDs: {doc['wbs_ids']}")
    
    # Init aggregation to test the lookup logic
    pipeline = [
        {"$match": {"_id": doc["_id"]}},
        {
            "$lookup": {
                "from": "wbsnodes",
                "localField": "wbs_ids",
                "foreignField": "_id",
                "as": "wbs_nodes",
            }
        }
    ]
    
    res = list(coll.aggregate(pipeline))
    if not res:
        print("Aggregation failed.")
        return
        
    wbs_nodes = res[0]["wbs_nodes"]
    print(f"\nFound {len(wbs_nodes)} linked WBS nodes:")
    for w in wbs_nodes:
        print(f" - Code: {w.get('code')}, Type: {w.get('type')}, Desc: {w.get('description')}")
        
    # Test the regex filter logic
    print("\nApplying Filter logic (WBS 0?6)...")
    import re
    
    found_desc = None
    for w in wbs_nodes:
        w_type = w.get('type', '')
        if w_type and re.search(r"WBS 0?6", w_type, re.IGNORECASE):
            print(f" MATCH! -> Code: {w.get('code')}, Desc: {w.get('description')}")
            found_desc = w.get('description')
        else:
            print(f" No Match: {w_type}")

if __name__ == "__main__":
    debug_wbs()
