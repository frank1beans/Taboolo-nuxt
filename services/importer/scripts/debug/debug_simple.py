
import pymongo
import os
import sys
# Add current directory to path
sys.path.append(os.getcwd())

from bson import ObjectId

def check_aggregation_fixed():
    try:
        # Load env
        try:
             from dotenv import load_dotenv
             load_dotenv(os.path.join(os.getcwd(), '.env'))
        except:
             pass
        
        uri = os.getenv("MONGODB_URI")
        if not uri:
            uri = "mongodb://localhost:27017/taboolo"
            
        client = pymongo.MongoClient(uri, serverSelectionTimeoutMS=5000)
        db = client.test # Database is 'test' as per previous findings
        
        project_id = ObjectId("694867af865e3b0469153450")
        # Correct ID from Step 98 findings
        estimate_id = ObjectId("69486945865e3b0469153460") 
        
        print(f"Target Project: {project_id}")
        print(f"Target Estimate: {estimate_id}")
        
        # Verify items exist
        count = db.estimateitems.count_documents({
            "project_id": project_id,
            "project.estimate_id": estimate_id
        })
        print(f"Found {count} items for this estimate.")
        
        if count == 0:
            print("Abort: No items found. Check ID again?")
            return

        # Pipeline to test lookup
        pipeline = [
            {
                "$match": {
                    "project_id": project_id,
                    "project.estimate_id": estimate_id
                }
            },
            { "$limit": 1 },
            {
                "$addFields": {
                    "is_valid_oid": {
                        "$regexMatch": { "input": "$price_list_item_id", "regex": "^[0-9a-fA-F]{24}$" } 
                    }
                }
            },
            {
                "$lookup": {
                    "from": "pricelistitems",
                    "let": {
                        "raw_id": "$price_list_item_id",
                        "is_valid": "$is_valid_oid",
                        "pid": "$project_id"
                    },
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$and": [
                                        { "$eq": ["$project_id", "$$pid"] },
                                        {
                                            "$or": [
                                                {
                                                    "$and": [
                                                        { "$eq": ["$$is_valid", True] },
                                                        { "$eq": ["$_id", { "$toObjectId": "$$raw_id" }] }
                                                    ]
                                                },
                                                { "$eq": ["$code", "$$raw_id"] }
                                            ]
                                        }
                                    ]
                                }
                            }
                        }
                    ],
                    "as": "price_item_lookup"
                }
            }
        ]
        
        print("Running aggregation pipeline...")
        results = list(db.estimateitems.aggregate(pipeline))
        print(f"Results returned: {len(results)}")
        
        for doc in results:
            print("-" * 20)
            print(f"Item ID: {doc.get('_id')}")
            raw = doc.get('price_list_item_id')
            print(f"PLI ID (raw): '{raw}' (Type: {type(raw)})")
            print(f"is_valid_oid: {doc.get('is_valid_oid')}")
            lookup = doc.get('price_item_lookup')
            print(f"Lookup matched {len(lookup) if lookup else 0} items.")
            
            if not lookup or len(lookup) == 0:
                print("DEBUG: Lookup FAILED.")
                # Verify manual find again
                if raw and len(raw) == 24:
                    existing = db.pricelistitems.find_one({"_id": ObjectId(raw)})
                    print(f"Manual DB check for PLI {raw}: {'FOUND' if existing else 'NOT FOUND'}")
                    if existing:
                        print(f"  PLI Project ID: {existing.get('project_id')}")
                        print(f"  Expected Project ID: {project_id}")
                        print(f"  Match? {existing.get('project_id') == project_id}")
            else:
                 print("DEBUG: Lookup SUCCESS.")
                 pli = lookup[0]
                 print(f"  PLI Code: {pli.get('code')}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_aggregation_fixed()
