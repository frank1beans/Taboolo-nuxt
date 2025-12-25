
import pymongo
import os
import sys
from bson import ObjectId
import pprint

def check_estimate_codes():
    try:
        uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/taboolo")
        client = pymongo.MongoClient(uri)
        db = client.get_database() 
        if not db.name:
            db = client.taboolo
            
        print(f"Connected to DB: {db.name}")
        
        estimate_id_str = "694869f5865e3b0169153460" # From screenshot URL
        project_id_str = "694867af865e3b0469153450" # From screenshot URL
        
        estimate_id = ObjectId(estimate_id_str)
        project_id = ObjectId(project_id_str)
        
        print(f"Checking Estimate: {estimate_id} in Project: {project_id}")
        
        coll_ei = db.estimateitems
        coll_pli = db.pricelistitems
        
        # Finditems for this estimate
        items = list(coll_ei.find({"project.estimate_id": estimate_id}).limit(5))
        
        print(f"Found {len(items)} items (showing first 5).")
        
        for item in items:
            print("-" * 40)
            print(f"EstimateItem ID: {item.get('_id')}")
            print(f"  Progressive: {item.get('progressive')}")
            print(f"  Code (in EI): {item.get('code')}")
            
            raw_pli_id = item.get('price_list_item_id')
            ei_p_id = item.get('project_id')
            
            print(f"  Referenced PLI ID (raw): '{raw_pli_id}' (Type: {type(raw_pli_id)})")
            print(f"  Project ID (in EI): {ei_p_id}")
            
            if not raw_pli_id:
                print("  => No PLI ID referenced.")
                continue
                
            # Try to find PLI
            pli = None
            
            # 1. Try by ObjectId
            if ObjectId.is_valid(raw_pli_id):
                pli = coll_pli.find_one({"_id": ObjectId(raw_pli_id)})
                if pli:
                    print("  => Found PLI by ObjectId Match!")
            
            # 2. Try by Code (fallback in code)
            if not pli:
                pli = coll_pli.find_one({"code": raw_pli_id, "project_id": project_id})
                if pli:
                    print(f"  => Found PLI by Code Match (with project_id filter)!")
                else:
                    # Try without project filter to see if it exists else where
                    pli_any = coll_pli.find_one({"code": raw_pli_id})
                    if pli_any:
                         print(f"  => Found PLI by Code Match BUT Project ID Mismatch! Found in project: {pli_any.get('project_id')}")
                    else:
                        print("  => PLI NOT FOUND by Code either.")

            if pli:
                print(f"     PLI ID: {pli.get('_id')}")
                print(f"     PLI Code: {pli.get('code')}")
                print(f"     PLI Project ID: {pli.get('project_id')}")
                
                # Check strict equality for lookup
                lookup_match_oid = (str(pli.get('_id')) == str(raw_pli_id) and str(pli.get('project_id')) == str(ei_p_id))
                lookup_match_code = (pli.get('code') == raw_pli_id and str(pli.get('project_id')) == str(ei_p_id))
                
                print(f"     Lookup by OID should match? {lookup_match_oid}")
                print(f"     Lookup by Code should match? {lookup_match_code}")
            else:
                # If we tried by OID and failed, try seeing if it exists in another project?
                if ObjectId.is_valid(raw_pli_id):
                    pli_any = coll_pli.find_one({"_id": ObjectId(raw_pli_id)})
                    if pli_any:
                        print(f"  => Found PLI by OID BUT Project ID Mismatch! Found in project: {pli_any.get('project_id')}")
                    else:
                        print("  => PLI NOT FOUND by OID anywhere.")

            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_estimate_codes()
