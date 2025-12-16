
import pymongo
import os
import sys

def check_item():
    try:
        # Default URI or from env
        uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/taboolo")
        client = pymongo.MongoClient(uri)
        db = client.get_database() # Uses default db from uri if present, else needs name
        
        # If uri doesn't have db name, assume 'taboolo'
        if not db.name:
            db = client.taboolo
            
        print(f"Connected to DB: {db.name}")
        
        # Collection name: 'estimateitems' (Mongoose default lowercase plural usually)
        # But schema says 'EstimateItem' model, so usually 'estimateitems'
        
        coll = db.estimateitems
        
        # Searching for item 11230
        item = coll.find_one({"progressive": 11230})
        
        if item:
            print("Item found!")
            print(f"ID: {item.get('_id')}")
            print(f"Code: {item.get('code')}")
            print(f"Description: {item.get('description')}")
            
            project_data = item.get('project', {})
            print(f"Quantity in DB: {project_data.get('quantity')}")
            print(f"Amount in DB: {project_data.get('amount')}")
            print(f"Unit Price: {project_data.get('unit_price')}")
            
            print("\nDetails / Measurements:")
            # In MongoDB this might be stored in 'measurements' array on the document? 
            # Or inside 'project' object? Schema says: project: { ... }, offers: [...]
            # Wait, EstimateItem schema has `measurements`? NO. 
            # Schema: project: { estimate_id, quantity, unit_price, amount, notes }
            # Wait, where are the measurement details stored? 
            # Loader puts them in `measurements` field but Schema def MIGHT NOT show it if I looked at `IProjectItemData`.
            # Let's check the Schema view again or just print the whole doc to be safe.
            import pprint
            pprint.pprint(item)
            
        else:
            print("Item 11230 not found.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_item()
