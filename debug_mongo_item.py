from pymongo import MongoClient
import sys

def check_item():
    client = MongoClient("mongodb://localhost:27017/")
    db = client["taboolo_v2"]
    
    # Project from last run
    project_id = "69407534520ff4298400b88a"
    estimate_id = "69407535520ff4298400bfaa" 
    
    print(f"Checking Estimate: {estimate_id}")
    
    # Find item 2280 (Progressive 2280)
    # The 'progressive' field is stored in EstimateItem
    item_2280 = db.estimate_items.find_one({
        "estimateId": estimate_id,
        "progressive": 2280.0
    })
    
    if item_2280:
        print(f"\nTarget Item [2280]:")
        print(f"  Qty: {item_2280.get('quantity')}")
        print(f"  Desc: {item_2280.get('description')}")
        print(f"  Refs: {item_2280.get('relatedItemId')}")
    else:
        print("Item 2280 not found!")

    # Find item referencing 2280
    # Search for description containing "vedi voce n. 2280" in DB isn't easy if we didn't store the comment in description.
    # But usually 'vedi voce' is in the item description OR measurements.
    # In parser, we looked at 'prvCommento' which might not be saved to DB text.
    
    # However, we know parser logs showed it.
    # Let's verify simply by iterating items and checking if quantity > 0 for this item?
    # Or just look at item 2280 first.

if __name__ == "__main__":
    check_item()
