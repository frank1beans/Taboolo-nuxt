
import pymongo
import os
import sys
# Add current directory to path
sys.path.append(os.getcwd())

from bson import ObjectId

def check_success_type():
    try:
        # Hardcoded URI
        uri = "mongodb+srv://francescobiggi12:!!Kombucha3416@cluster0.mp0kxea.mongodb.net/?appName=Cluster0"
            
        client = pymongo.MongoClient(uri, serverSelectionTimeoutMS=5000)
        db = client.test
        
        project_id = ObjectId("694867af865e3b0469153450")
        
        # dynamic search for working estimate
        one_item = db.estimateitems.find_one({"project_id": project_id})
        project_data = one_item.get('project', {})
        estimate_id = project_data.get('estimate_id')
        
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
                        "raw_id": "$price_list_item_id", # STRING
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
        
        results = list(db.estimateitems.aggregate(pipeline))
        
        if results:
            doc = results[0]
            lookup = doc.get('price_item_lookup')
            if lookup:
                pli = lookup[0]
                print(f"Matched PLI ID Value: {pli.get('_id')}")
                print(f"Matched PLI ID Type: {type(pli.get('_id'))}")
            else:
                 print("Lookup failed even for 'working' item.")
        else:
             print("No items found.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_success_type()
