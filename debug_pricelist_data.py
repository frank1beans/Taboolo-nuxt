
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
    print(f"\n--- Checking Estimate IDs ---")
    
    # 1. PriceListItems
    pli_fe1 = db.pricelistitems.count_documents({"project_id": ObjectId(PROJECT_ID), "estimate_id": ObjectId(EST_FE1)})
    pli_fe4 = db.pricelistitems.count_documents({"project_id": ObjectId(PROJECT_ID), "estimate_id": ObjectId(EST_FE4)})
    print(f"PriceListItems for FE1 (Url): {pli_fe1}")
    print(f"PriceListItems for FE4 (DB): {pli_fe4}")

    # 2. EstimateItems
    ei_fe1 = db.estimateitems.count_documents({"project_id": ObjectId(PROJECT_ID), "project.estimate_id": ObjectId(EST_FE1)})
    ei_fe4 = db.estimateitems.count_documents({"project_id": ObjectId(PROJECT_ID), "project.estimate_id": ObjectId(EST_FE4)})
    print(f"EstimateItems for FE1 (Url): {ei_fe1}")
    print(f"EstimateItems for FE4 (DB): {ei_fe4}")

if __name__ == "__main__":
    debug_data()
