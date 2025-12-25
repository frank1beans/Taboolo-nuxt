"""
Debug script to inspect WBS6 descriptions and find duplicates
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import pymongo
from bson import ObjectId
from collections import Counter

# Import the clean function
import re

def clean_wbs_desc(desc: str, code: str) -> str:
    """Removes the code prefix and separators from WBS description, normalizes text."""
    if not desc:
        return ""
    
    cleaned = desc.strip()
    
    # Remove code prefix if present (at start or anywhere)
    if code:
        if cleaned.startswith(code):
            cleaned = cleaned[len(code):].strip()
        # Also try without leading zeros (A020 -> A20)
        code_alt = code.lstrip("0") if code[0].isdigit() else code
        if cleaned.startswith(code_alt):
            cleaned = cleaned[len(code_alt):].strip()
    
    # Remove separator chars if present (-, –, :, .)
    while cleaned and cleaned[0] in "-–:.":
        cleaned = cleaned[1:].strip()
    
    # Normalize whitespace (collapse multiple spaces)
    cleaned = re.sub(r'\s+', ' ', cleaned)
    
    # Normalize to title case for consistency
    cleaned = cleaned.strip().title()
    
    return cleaned if cleaned else desc


def main():
    mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/test")
    client = pymongo.MongoClient(mongo_uri)
    
    try:
        db = client.get_database()
    except:
        db = client.get_database("test")
    
    coll = db.pricelistitems if "pricelistitems" in db.list_collection_names() else db.pricelistitem
    
    # Get all items with their WBS info
    pipeline = [
        {"$match": {"embedding": {"$type": "array"}}},
        {
            "$lookup": {
                "from": "wbsnodes",
                "localField": "wbs_ids",
                "foreignField": "_id",
                "as": "wbs_nodes",
            }
        },
        {
            "$addFields": {
                "wbs06_node": {
                    "$filter": {
                        "input": "$wbs_nodes",
                        "as": "wbs",
                        "cond": {
                            "$regexMatch": {
                                "input": {"$ifNull": ["$$wbs.type", ""]},
                                "regex": "WBS 0?6",
                                "options": "i",
                            }
                        },
                    }
                }
            }
        },
        {"$addFields": {
            "wbs6_code": {"$arrayElemAt": ["$wbs06_node.code", 0]},
            "wbs6_desc": {"$arrayElemAt": ["$wbs06_node.description", 0]}
        }},
        {
            "$project": {
                "wbs6_code": {"$ifNull": ["$wbs6_code", "UNKNOWN"]},
                "wbs6_desc": 1,
            }
        },
    ]
    
    docs = list(coll.aggregate(pipeline))
    print(f"Total items with embeddings: {len(docs)}")
    
    # Collect raw and cleaned descriptions
    raw_descs = []
    cleaned_descs = []
    
    for d in docs:
        code = d.get("wbs6_code", "")
        raw = str(d.get("wbs6_desc") or "")
        cleaned = clean_wbs_desc(raw, code)
        if not cleaned:
            cleaned = code
        raw_descs.append(f"{code}: {raw}")
        cleaned_descs.append(cleaned)
    
    # Count unique
    raw_unique = set(raw_descs)
    cleaned_unique = set(cleaned_descs)
    
    print(f"\n=== RAW DESCRIPTIONS (unique: {len(raw_unique)}) ===")
    for desc in sorted(raw_unique):
        print(f"  {desc}")
    
    print(f"\n=== CLEANED DESCRIPTIONS (unique: {len(cleaned_unique)}) ===")
    for desc in sorted(cleaned_unique):
        count = cleaned_descs.count(desc)
        print(f"  [{count:4d}] {desc}")
    
    # Find potential duplicates (similar names)
    print(f"\n=== POTENTIAL DUPLICATES ===")
    cleaned_list = sorted(cleaned_unique)
    for i, desc1 in enumerate(cleaned_list):
        for desc2 in cleaned_list[i+1:]:
            # Check if they're very similar (one contains the other, or same start)
            if desc1.lower() in desc2.lower() or desc2.lower() in desc1.lower():
                print(f"  Similar: '{desc1}' <-> '{desc2}'")
            elif desc1[:10].lower() == desc2[:10].lower():
                print(f"  Same start: '{desc1}' <-> '{desc2}'")
    
    client.close()

if __name__ == "__main__":
    main()
