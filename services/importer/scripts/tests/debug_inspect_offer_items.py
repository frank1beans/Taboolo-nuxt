
from pymongo import MongoClient
import os
import sys
import json
from dotenv import load_dotenv

load_dotenv()

# Redirect stdout to file to avoid buffering issues and see output even if it fails later
sys.stdout = open('debug_offers.txt', 'w', encoding='utf-8')

# Connect to MongoDB
MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/taboolo_dev")
print(f"Connecting to: {MONGO_URI}")
client = MongoClient(MONGO_URI)
try:
    db = client.get_database()
except:
    db = client.get_database("test")

print(f"Connected to DB: {db.name}")

print("Searching for Offers...")
# Get one offer
offer = db.offers.find_one({}, {'company_name': 1, 'round_number': 1})
if not offer:
    print("No offer found")
else:
    print(f"Checking items for Offer ID: {offer['_id']} ({offer.get('company_name')})")

    items = list(db.offeritems.find({'offer_id': offer['_id']}).limit(5))
    for i, item in enumerate(items):
        print(f"\nItem {i+1}:")
        # serialization helper
        def default(o):
            return str(o)
        
        # Print keys relevant to price/quantity
        relevant = {k: v for k, v in item.items() if k in ['quantity', 'unit_price', 'amount', 'price_list_item_id', '_id', 'total_amount']}
        print(json.dumps(relevant, default=default, indent=2))
