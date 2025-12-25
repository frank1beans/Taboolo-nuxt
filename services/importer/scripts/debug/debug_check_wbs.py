
import pymongo
import os
import sys
# Add current directory to path
sys.path.append(os.getcwd())

from bson import ObjectId

def check_wbs_dynamic():
    try:
        # Hardcoded URI
        uri = "mongodb+srv://francescobiggi12:!!Kombucha3416@cluster0.mp0kxea.mongodb.net/?appName=Cluster0"
            
        client = pymongo.MongoClient(uri, serverSelectionTimeoutMS=5000)
        db = client.test
        
        project_id = ObjectId("694867af865e3b0469153450")
        
        # dynamic search
        one_item = db.estimateitems.find_one({"project_id": project_id})
        
        if not one_item:
            print("No items found for this project.")
            return

        project_data = one_item.get('project', {})
        estimate_id = project_data.get('estimate_id')
        print(f"Using Estimate ID: {estimate_id}")
        
        items = list(db.estimateitems.find({"project.estimate_id": estimate_id}).limit(3))
        
        for item in items:
            print("=" * 40)
            print(f"Item ID: {item.get('_id')}")
            print(f"EI Code: '{item.get('code')}'")
            print(f"EI WBS IDs: {item.get('wbs_ids')}")
            
            raw_pli = item.get('price_list_item_id')
            pli = None
            if raw_pli and ObjectId.is_valid(raw_pli):
                pli = db.pricelistitems.find_one({"_id": ObjectId(raw_pli)})
            
            if pli:
                print(f"PLI Code: '{pli.get('code')}'")
                print(f"PLI WBS IDs: {pli.get('wbs_ids')}")
            else:
                print("PLI Not Found.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_wbs_dynamic()
