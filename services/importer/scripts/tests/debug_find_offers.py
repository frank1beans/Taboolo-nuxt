
from pymongo import MongoClient
import os
import sys

# Connect to MongoDB
mongo_uri = os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/taboolo_dev')
client = MongoClient(mongo_uri)
db = client.get_database()

# Find an offer to get valid company/round/estimate_id tuples
print("Searching for Offers...")
offers = list(db.offers.find({}, {'company_name': 1, 'round_number': 1, 'project_id': 1, 'estimate_id': 1}).limit(5))

if not offers:
    print("No offers found.")
else:
    for o in offers:
        print(f"Offer: ID={o['_id']}, Company={o.get('company_name')}, Round={o.get('round_number')}, EstID={o.get('estimate_id')}")

# Also check for OfferItems for one of these offers to see their structure
if offers:
    offer_id = offers[0]['_id']
    print(f"\nChecking items for Offer {offer_id}...")
    items = list(db.offeritems.find({'offer_id': offer_id}).limit(3))
    for i in items:
        print(f"Item: Qty={i.get('quantity')}, Price={i.get('unit_price')}, Amount={i.get('amount')}")
