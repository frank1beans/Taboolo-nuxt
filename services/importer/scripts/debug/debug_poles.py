
import pymongo
import os
import sys

# Add current directory to path
sys.path.append(os.getcwd())

from bson import ObjectId

def check_poles():
    try:
        # uri = os.getenv("MONGODB_URI") or "mongodb://localhost:27017/test"
        uri = "mongodb+srv://francescobiggi12:!!Kombucha3416@cluster0.mp0kxea.mongodb.net/?appName=Cluster0"
        client = pymongo.MongoClient(uri, serverSelectionTimeoutMS=5000)
        
        try:
            db = client.get_database()
        except:
            db = client.test

        print(f"Checking database: {db.name}")
        
        # Check collection existence
        colls = db.list_collection_names()
        if "semantic_poles" not in colls:
            print("ERROR: 'semantic_poles' collection does NOT exist.")
            return

        poles_coll = db.semantic_poles
        count = poles_coll.count_documents({})
        print(f"Total poles found: {count}")
        
        if count > 0:
            print("\nSample poles:")
            for p in poles_coll.find().limit(5):
                print(p)
                
            # Check for GLOBAL poles
            global_count = poles_coll.count_documents({"project_id": "GLOBAL_MULTI_PROJECT"})
            print(f"\nGlobal poles (GLOBAL_MULTI_PROJECT): {global_count}")
        else:
            print("Collection exists but is empty.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_poles()
