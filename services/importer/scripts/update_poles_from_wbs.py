"""
Script per aggiornare le descrizioni dei poli usando normalized_description dai WBS nodes.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import pymongo
from dotenv import load_dotenv

# Load .env from the importer service directory
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
load_dotenv(env_path)


def run_update():
    """Aggiorna le descrizioni dei poli con normalized_description dai WBS nodes."""
    
    mongo_uri = os.getenv("MONGODB_URI")
    if not mongo_uri:
        print("MONGODB_URI not found, using localhost default.")
        mongo_uri = "mongodb://localhost:27017/test"
    
    client = pymongo.MongoClient(mongo_uri, connectTimeoutMS=30000)
    
    try:
        db = client.get_database()
    except pymongo.errors.ConfigurationError:
        db = client.get_database("test")
    
    print(f"Connected to database: {db.name}")
    
    # 1. Build mapping wbs6_code -> normalized_description from wbsnodes
    print("\n--- Building WBS6 normalized_description mapping ---")
    wbs_coll = db.wbsnodes if "wbsnodes" in db.list_collection_names() else db.wbsnode
    
    wbs6_mapping = {}
    for node in wbs_coll.find({"level": 6}):
        code = node.get("code", "")
        if code:
            norm_desc = node.get("normalized_description") or node.get("description", "")
            # Keep the first one found (or could aggregate)
            if code not in wbs6_mapping:
                wbs6_mapping[code] = norm_desc.strip()
    
    print(f"Found {len(wbs6_mapping)} unique WBS6 codes with descriptions")
    
    # 2. Update semantic_poles descriptions
    if "semantic_poles" not in db.list_collection_names():
        print("Collection 'semantic_poles' not found.")
        client.close()
        return
    
    poles_coll = db.semantic_poles
    updated = 0
    
    for pole in poles_coll.find({}):
        pole_id = pole["_id"]
        wbs6_code = pole.get("wbs6", "")
        current_desc = pole.get("description", "")
        
        if wbs6_code in wbs6_mapping:
            new_desc = wbs6_mapping[wbs6_code]
            if new_desc and new_desc != current_desc:
                print(f"  {wbs6_code}: '{current_desc}' -> '{new_desc}'")
                poles_coll.update_one(
                    {"_id": pole_id},
                    {"$set": {"description": new_desc}}
                )
                updated += 1
    
    print(f"\nUpdated {updated} poles with normalized descriptions")
    
    # 3. Show final state
    print("\n--- Final poles ---")
    for pole in poles_coll.find({}).sort("wbs6"):
        print(f"  {pole.get('wbs6', '?')}: {pole.get('description', '')}")
    
    client.close()


if __name__ == "__main__":
    run_update()
