"""Debug script to find exact duplicate categories"""
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(script_dir, "..", ".."))
load_dotenv(os.path.join(project_root, ".env"))

import pymongo
from collections import Counter

def main():
    mongo_uri = os.getenv("MONGODB_URI")
    client = pymongo.MongoClient(mongo_uri)
    try:
        db = client.get_database()
    except:
        db = client.get_database("test")
    
    # Check semantic_poles for duplicates
    poles = list(db.semantic_poles.find({"project_id": "GLOBAL_MULTI_PROJECT"}))
    print(f"Total poles: {len(poles)}")
    
    # Find duplicates by description
    desc_list = [p.get("description", "") or p.get("wbs6", "") for p in poles]
    desc_counter = Counter(desc_list)
    
    print("\n--- Duplicate descriptions ---")
    for desc, count in desc_counter.most_common():
        if count > 1:
            print(f"  [{count}x] '{desc}'")
    
    print("\n--- All pole descriptions with hex bytes ---")
    for p in sorted(poles, key=lambda x: x.get("description", "")):
        desc = p.get("description", "")
        wbs6 = p.get("wbs6", "")
        # Show hex representation to find hidden chars
        print(f"  wbs6='{wbs6}' desc='{desc}' hex={desc.encode('utf-8').hex()[:40]}")
    
    # Check wbsnodes normalized_description
    print("\n--- Checking wbsnodes normalized_description ---")
    wbs6_nodes = list(db.wbsnodes.find({"level": 6, "normalized_description": {"$exists": True}}))
    norm_counter = Counter([n.get("normalized_description", "") for n in wbs6_nodes])
    
    print(f"WBS6 nodes with normalized_description: {len(wbs6_nodes)}")
    for norm, count in norm_counter.most_common(10):
        print(f"  [{count}x] '{norm}'")
    
    client.close()

if __name__ == "__main__":
    main()
