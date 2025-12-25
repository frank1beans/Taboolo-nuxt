
import pymongo
import os
import sys
# Add current directory to path
sys.path.append(os.getcwd())

from bson import ObjectId

def check_estimate_id():
    try:
        # Hardcoded URI
        uri = "mongodb+srv://francescobiggi12:!!Kombucha3416@cluster0.mp0kxea.mongodb.net/?appName=Cluster0"
            
        client = pymongo.MongoClient(uri, serverSelectionTimeoutMS=5000)
        db = client.test # Database is 'test'
        
        # User URL ID
        url_est_id_str = "694869f5865e3b0169153460" # From screenshot (verified OCR 'f5')
        # DB Item ID found in Step 98
        item_est_id_str = "69486945865e3b0469153460" # (verified '45')
        
        print(f"Checking URL Estimate ID: {url_est_id_str}")
        est_f5 = db.estimates.find_one({"_id": ObjectId(url_est_id_str)})
        if est_f5:
            print("FOUND Estimate ...f5 (URL ID)!")
            print(f"  Name: {est_f5.get('name')}")
            print(f"  Description: {est_f5.get('description')}")
        else:
            print("NOT FOUND Estimate ...f5 (URL ID).")

        print(f"\nChecking Item Estimate ID: {item_est_id_str}")
        est_45 = db.estimates.find_one({"_id": ObjectId(item_est_id_str)})
        if est_45:
            print("FOUND Estimate ...45 (Item ID)!")
            print(f"  Name: {est_45.get('name')}")
        else:
            print("NOT FOUND Estimate ...45 (Item ID).")

        # Also check items again for BOTH
        c_f5 = db.estimateitems.count_documents({"project.estimate_id": ObjectId(url_est_id_str)})
        c_45 = db.estimateitems.count_documents({"project.estimate_id": ObjectId(item_est_id_str)})
        
        print(f"\nItems count for ...f5: {c_f5}")
        print(f"Items count for ...45: {c_45}")

    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_estimate_id()
