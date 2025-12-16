from pymongo import MongoClient

def find_missing_amount():
    client = MongoClient("mongodb://localhost:27017/")
    db = client["taboolo_v2"]
    
    project_id = "694078e1520ff4298400cf2e"
    estimate_id = "694078e2520ff4298400d64e"
    
    target = 608.20
    tolerance = 1.0
    
    print(f"Searching for items with amount {target} +/- {tolerance} in Estimate {estimate_id}")
    
    pipeline = [
        {"$match": {"estimateId": estimate_id}},
        {"$project": {
            "progressive": 1, 
            "description": 1, 
            "amount": 1, 
            "quantity": 1, 
            "unitPrice": 1,
            "diff": {"$abs": {"$subtract": ["$amount", target]}}
        }},
        {"$match": {"diff": {"$lte": tolerance}}},
        {"$sort": {"diff": 1}}
    ]
    
    items = list(db.estimate_items.aggregate(pipeline))
    
    if items:
        for item in items:
            print(f"MATCH FOUND: Prog: {item.get('progressive')} | Desc: {item.get('description')} | Amount: {item.get('amount')} | Qty: {item.get('quantity')} | Price: {item.get('unitPrice')}")
    else:
        print("No exact match found.")
        
    # Also check if there's a sum of small items? Unlikely to be exactly 608.20.
    # Check for negative 608.20?
    
    print(f"\nSearching for items with amount -{target} +/- {tolerance}")
    pipeline_neg = [
        {"$match": {"estimateId": estimate_id}},
        {"$project": {
            "progressive": 1, 
            "description": 1, 
            "amount": 1, 
            "quantity": 1, 
            "unitPrice": 1,
            "diff": {"$abs": {"$subtract": ["$amount", -target]}}
        }},
        {"$match": {"diff": {"$lte": tolerance}}},
        {"$sort": {"diff": 1}}
    ]
    
    items_neg = list(db.estimate_items.aggregate(pipeline_neg))
    if items_neg:
        for item in items_neg:
            print(f"NEGATIVE MATCH FOUND: Prog: {item.get('progressive')} | Desc: {item.get('description')} | Amount: {item.get('amount')}")
    else:
        print("No negative match found.")

if __name__ == "__main__":
    find_missing_amount()
