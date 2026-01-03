"""
Script per pulire le descrizioni dei poli semantici rimuovendo il codice WBS.
Esempio: "A012 - Opere murarie" -> "Opere murarie"
"""

import os
import sys
import re

# Add parent path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import pymongo
from dotenv import load_dotenv

# Load .env from the importer service directory
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
load_dotenv(env_path)


def clean_wbs_desc(desc: str, code: str = "") -> str:
    """
    Removes the code prefix and separators from WBS description, normalizes text.
    Handles patterns like: "A012 - Opere murarie", "A012 Opere murarie", "A012: Opere murarie"
    """
    if not desc:
        return ""
    
    cleaned = desc.strip()
    
    # Pattern to match code at start (letter + digits, e.g. A012, B001, AA01)
    # followed by optional separator (-, –, :, ., space)
    code_pattern = r'^[A-Za-z]+\d+\s*[-–:.\s]*\s*'
    cleaned = re.sub(code_pattern, '', cleaned)
    
    # If a specific code is provided, also try to remove it
    if code:
        if cleaned.startswith(code):
            cleaned = cleaned[len(code):].strip()
        # Also try without leading zeros (A020 -> A20)
        code_alt = code.lstrip("0") if code and code[0].isdigit() else code
        if cleaned.startswith(code_alt):
            cleaned = cleaned[len(code_alt):].strip()
    
    # Remove separator chars if still present at start
    while cleaned and cleaned[0] in "-–:.":
        cleaned = cleaned[1:].strip()
    
    # Normalize whitespace
    cleaned = re.sub(r'\s+', ' ', cleaned)
    
    # Title case for consistency
    cleaned = cleaned.strip().title()
    
    return cleaned if cleaned else desc


def run_cleanup():
    """Pulisce le descrizioni dei poli nel database."""
    
    mongo_uri = os.getenv("MONGODB_URI")
    if not mongo_uri:
        print("MONGODB_URI not found, using localhost default.")
        mongo_uri = "mongodb://localhost:27017/test"
    
    client = pymongo.MongoClient(mongo_uri, connectTimeoutMS=30000)
    
    try:
        db = client.get_database()
    except pymongo.errors.ConfigurationError:
        db = client.get_database("test")
    
    print(f"Connected to database: {db.name}")
    
    if "semantic_poles" not in db.list_collection_names():
        print("Collection 'semantic_poles' not found. Nothing to clean.")
        client.close()
        return
    
    poles_coll = db.semantic_poles
    total = poles_coll.count_documents({})
    print(f"Found {total} poles to check")
    
    updated_count = 0
    
    for pole in poles_coll.find({}):
        pole_id = pole["_id"]
        wbs6 = pole.get("wbs6", "")
        description = pole.get("description", "")
        
        # Pulisci la description
        cleaned_desc = clean_wbs_desc(description, wbs6)
        
        # Pulisci anche wbs6 se contiene il pattern codice + descrizione
        cleaned_wbs6 = wbs6
        if wbs6 and re.match(r'^[A-Za-z]+\d+\s*[-–:.\s]+', wbs6):
            # wbs6 contiene codice + separatore, estrai solo il codice
            code_match = re.match(r'^([A-Za-z]+\d+)', wbs6)
            if code_match:
                cleaned_wbs6 = code_match.group(1)
        
        # Aggiorna solo se qualcosa è cambiato
        if cleaned_desc != description or cleaned_wbs6 != wbs6:
            print(f"  Updating pole:")
            print(f"    wbs6: '{wbs6}' -> '{cleaned_wbs6}'")
            print(f"    description: '{description}' -> '{cleaned_desc}'")
            
            poles_coll.update_one(
                {"_id": pole_id},
                {"$set": {
                    "description": cleaned_desc,
                    "wbs6": cleaned_wbs6,
                }}
            )
            updated_count += 1
    
    print(f"\nDone! Updated {updated_count} poles out of {total}")
    client.close()


if __name__ == "__main__":
    run_cleanup()
