
import pymongo
import os
from dotenv import load_dotenv

load_dotenv()

def check_collections():
    uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/taboolo")
    client = pymongo.MongoClient(uri)
    db = client.get_database("test")
    
    print(f"Database: {db.name}")
    print("Collections:", db.list_collection_names())
    
    if "pricelistitems" in db.list_collection_names():
        print("Found 'pricelistitems' collection.")
        # Check one doc for structure
        doc = db.pricelistitems.find_one()
        if doc:
            print("Sample doc keys:", doc.keys())
            if "embedding" in doc:
                print("Found 'embedding' field.")
            else:
                print("'embedding' field NOT found in sample.")
    else:
        print("'pricelistitems' collection NOT found.")

if __name__ == "__main__":
    check_collections()
