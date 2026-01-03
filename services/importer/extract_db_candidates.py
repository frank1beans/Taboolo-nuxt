
import os
import sys
import json
import pymongo
from dotenv import load_dotenv

# Load env variables
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(script_dir, "..", ".."))
env_path = os.path.join(project_root, ".env")
load_dotenv(env_path)

def main():
    mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/test")
    print(f"Connecting to MongoDB: {mongo_uri}")
    
    client = pymongo.MongoClient(mongo_uri)
    try:
        db = client.get_database()
    except:
        db = client.get_database("test")
        
    if "pricelistitems" in db.list_collection_names():
        coll = db.pricelistitems
    else:
        coll = db.pricelistitem
        
    print(f"Collection: {coll.name}")
    
    # Prioritize actual construction items, not just mentions
    query = {
        "$or": [
            {"description": {"$regex": "^Parete", "$options": "i"}},
            {"description": {"$regex": "^Controsoffitto", "$options": "i"}},
            {"description": {"$regex": "Lastra in cartongesso", "$options": "i"}},
            {"long_description": {"$regex": "^Parete", "$options": "i"}},
            {"long_description": {"$regex": "^Controsoffitto", "$options": "i"}}
        ]
    }
    
    # Fetch 50 items
    cursor = coll.find(query).limit(50)
    
    candidates = []
    for doc in cursor:
        desc = doc.get("long_description") or doc.get("description")
        if not desc or len(desc) < 20:
            continue
            
        candidates.append({
            "id": str(doc["_id"]),
            "code": doc.get("code"),
            "description": desc,
            "expected_properties": {} 
        })
        
    print(f"Found {len(candidates)} candidates.")
    
    output_dir = os.path.join(script_dir, "embedding", "extraction")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "goldenset_candidates.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(candidates, f, indent=2, ensure_ascii=False)
        
    print(f"Saved to {output_path}")

if __name__ == "__main__":
    main()
