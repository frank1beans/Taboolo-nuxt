
import os
import sys
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

# Redirect stdout to file
sys.stdout = open('debug_log.txt', 'w', encoding='utf-8')

# Connect to MongoDB
MONGO_URI = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017/taboolo-local")
print(f"Connecting to: {MONGO_URI}")
client = MongoClient(MONGO_URI)
try:
    db = client.get_database()
except:
    print("No default DB in URI, listing databases...")
    print(client.list_database_names())
    db = client.get_database("test")
print(f"Connected to DB: {db.name}")

PROJECT_ID = "694933c9885765b245016fd4"
EST_FE1 = "69493531885765b245016fe1"
EST_FE4 = "69493534885765b245016fe4"

def debug_data():
    print(f"\n--- Distinct Estimate IDs in PriceListItems ---")
    distinct_est_ids = db.pricelistitems.distinct("estimate_id", {"project_id": ObjectId(PROJECT_ID)})
    for eid in distinct_est_ids:
        print(f"Est ID: {eid}, Type: {type(eid)}")
        count = db.pricelistitems.count_documents({"project_id": ObjectId(PROJECT_ID), "estimate_id": eid})
        print(f"  Count: {count}")

        # Check for matching EstimateItems
        ei_count = db.estimateitems.count_documents({"project_id": ObjectId(PROJECT_ID), "project.estimate_id": eid})
        print(f"  EstimateItems Count: {ei_count}")
        
        # Sample EI
        ei = db.estimateitems.find_one({"project_id": ObjectId(PROJECT_ID), "project.estimate_id": eid})
        if ei:
             pli_id = ei.get('price_list_item_id')
             print(f"    Sample EI PLI_ID: {pli_id}, Type: {type(pli_id)}")

    print(f"\n--- Aggregation Test with FE4 ({EST_FE4}) ---")
    pipeline = [
        {"$match": {"project_id": ObjectId(PROJECT_ID), "estimate_id": ObjectId(EST_FE4)}},
        {"$limit": 5},
        {
          "$lookup": {
            "from": "estimateitems",
            "let": { "pli_id": "$_id" },
            "pipeline": [
              {
                "$match": {
                  "$expr": { "$eq": [{ "$convert": { "input": "$price_list_item_id", "to": "objectId", "onError": None, "onNull": None } }, "$$pli_id"] },
                  "project_id": ObjectId(PROJECT_ID),
                  "project.estimate_id": ObjectId(EST_FE4)
                }
              }
            ],
            "as": "related_items"
          }
        },
        {
          "$addFields": {
            "total_quantity": { "$sum": "$related_items.project.quantity" },
            "related_count": { "$size": "$related_items" }
          }
        },
        {"$project": {"code": 1, "total_quantity": 1, "related_count": 1}}
    ]
    
    results = list(db.pricelistitems.aggregate(pipeline))
    if not results:
        print("No results from aggregation match.")
    for res in results:
        print(res)

if __name__ == "__main__":
    debug_data()
