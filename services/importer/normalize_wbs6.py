"""
Script to normalize WBS6 descriptions and compute embeddings.
Run this once to populate normalized_description and embedding fields on wbsnodes.
"""
import os
import sys
import re
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load .env file from project root (Taboolo-nuxt/.env)
from dotenv import load_dotenv
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(script_dir, "..", ".."))
env_path = os.path.join(project_root, ".env")
load_dotenv(env_path)
print(f"Loaded .env from: {env_path}")

import pymongo
from bson import ObjectId
from embedding import get_embedder

def clean_wbs_desc(desc: str, code: str) -> str:
    """Removes the code prefix and separators from WBS description, normalizes text."""
    if not desc:
        return ""
    
    cleaned = desc.strip()
    
    # Remove code prefix if present
    if code:
        if cleaned.startswith(code):
            cleaned = cleaned[len(code):].strip()
        # Also try with different formats
        code_patterns = [
            code,
            code.replace(" ", ""),
            code.upper(),
            code.lower(),
        ]
        for pattern in code_patterns:
            if cleaned.upper().startswith(pattern.upper()):
                cleaned = cleaned[len(pattern):].strip()
                break
    
    # Remove separator chars
    while cleaned and cleaned[0] in "-–:. ":
        cleaned = cleaned[1:].strip()
    
    # Normalize whitespace
    cleaned = re.sub(r'\s+', ' ', cleaned)
    
    # Title case for consistency
    cleaned = cleaned.strip().title()
    
    return cleaned if cleaned else desc


def main():
    print("=" * 60)
    print("WBS6 Normalization and Embedding Script")
    print("=" * 60)
    
    mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/test")
    print(f"Connecting to MongoDB...")
    
    client = pymongo.MongoClient(mongo_uri, connectTimeoutMS=30000, socketTimeoutMS=60000)
    
    try:
        db = client.get_database()
    except:
        db = client.get_database("test")
    
    # Find wbsnodes collection
    if "wbsnodes" in db.list_collection_names():
        coll = db.wbsnodes
    else:
        coll = db.wbsnode
    
    # Get all WBS6 nodes
    wbs6_nodes = list(coll.find({
        "$or": [
            {"level": 6},
            {"type": {"$regex": "WBS 0?6", "$options": "i"}}
        ]
    }))
    
    print(f"Found {len(wbs6_nodes)} WBS6 nodes")
    
    if not wbs6_nodes:
        print("No WBS6 nodes found. Exiting.")
        client.close()
        return
    
    # Normalize descriptions
    print("\n--- Normalizing descriptions ---")
    normalized_map = {}  # code -> normalized_desc
    
    for node in wbs6_nodes:
        code = node.get("code", "")
        desc = node.get("description", "")
        normalized = clean_wbs_desc(desc, code)
        
        print(f"  {code}: '{desc}' -> '{normalized}'")
        normalized_map[str(node["_id"])] = normalized
    
    # Count unique normalized descriptions
    unique_normalized = set(normalized_map.values())
    print(f"\nUnique normalized descriptions: {len(unique_normalized)}")
    for norm in sorted(unique_normalized):
        print(f"  - {norm}")
    
    # Compute embeddings for unique normalized descriptions
    print(f"\n--- Computing embeddings for {len(unique_normalized)} unique descriptions ---")
    
    embedder = get_embedder()
    unique_list = list(unique_normalized)
    embeddings = embedder.compute_embeddings(unique_list)
    
    # Map normalized -> embedding
    embedding_map = {}
    for i, norm in enumerate(unique_list):
        if embeddings[i] is not None:
            embedding_map[norm] = embeddings[i]
            print(f"  ✓ Embedded: '{norm}' (dim={len(embeddings[i])})")
        else:
            print(f"  ✗ Failed: '{norm}'")
    
    # Update nodes in database
    print(f"\n--- Updating {len(wbs6_nodes)} nodes in database ---")
    
    updated = 0
    for node in wbs6_nodes:
        node_id = node["_id"]
        normalized = normalized_map.get(str(node_id), "")
        embedding = embedding_map.get(normalized)
        
        update_fields = {"normalized_description": normalized}
        if embedding:
            update_fields["embedding"] = embedding
        
        result = coll.update_one(
            {"_id": node_id},
            {"$set": update_fields}
        )
        
        if result.modified_count > 0:
            updated += 1
    
    print(f"Updated {updated} nodes")
    
    # Verify
    print(f"\n--- Verification ---")
    sample = coll.find_one({"normalized_description": {"$exists": True}})
    if sample:
        print(f"Sample node:")
        print(f"  code: {sample.get('code')}")
        print(f"  description: {sample.get('description')}")
        print(f"  normalized_description: {sample.get('normalized_description')}")
        print(f"  embedding: {'Yes' if sample.get('embedding') else 'No'} (length={len(sample.get('embedding', []))})")
    
    client.close()
    print("\n✓ Done!")


if __name__ == "__main__":
    main()

