"""
Script per consolidare i poli semantici duplicati.
Unifica i poli con la stessa descrizione calcolando la media delle coordinate.
"""

import os
import sys
import re
from collections import defaultdict


def normalize_description(desc: str) -> str:
    """Normalizza la descrizione per confronto: rimuove codice WBS, lowercase, spazi."""
    if not desc:
        return ""
    cleaned = desc.strip()
    # Rimuovi pattern codice WBS all'inizio (es. "A012 - ", "B001: ")
    cleaned = re.sub(r'^[A-Za-z]+\d+\s*[-–:.\s]*\s*', '', cleaned)
    # Rimuovi separatori residui all'inizio
    cleaned = re.sub(r'^[-–:.\s]+', '', cleaned)
    # Normalizza spazi e lowercase
    cleaned = re.sub(r'\s+', ' ', cleaned).strip().lower()
    return cleaned

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import pymongo
from dotenv import load_dotenv

# Load .env from the importer service directory
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
load_dotenv(env_path)


def run_consolidation():
    """Consolida i poli duplicati nel database."""
    
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
        print("Collection 'semantic_poles' not found. Nothing to consolidate.")
        client.close()
        return
    
    poles_coll = db.semantic_poles
    
    # Raggruppa i poli per (project_id, type, description)
    # Così consolidiamo solo i duplicati all'interno dello stesso contesto
    groups = defaultdict(list)
    
    for pole in poles_coll.find({}):
        key = (
            str(pole.get("project_id", "")),
            pole.get("type", ""),
            normalize_description(pole.get("description", "")),  # Normalizza per confronto
        )
        groups[key].append(pole)
    
    # Trova i gruppi con duplicati
    duplicates = {k: v for k, v in groups.items() if len(v) > 1}
    print(f"Found {len(duplicates)} groups with duplicate poles")
    
    if not duplicates:
        print("No duplicates to consolidate!")
        client.close()
        return
    
    poles_to_delete = []
    poles_to_update = []
    
    for (project_id, pole_type, desc_lower), poles in duplicates.items():
        print(f"\n  Group: project={project_id}, type={pole_type}")
        print(f"    Description: '{poles[0].get('description', '')}'")
        print(f"    Count: {len(poles)}")
        
        # Calcola le medie delle coordinate
        xs = [p.get("x", 0) for p in poles if p.get("x") is not None]
        ys = [p.get("y", 0) for p in poles if p.get("y") is not None]
        zs = [p.get("z", 0) for p in poles if p.get("z") is not None]
        
        avg_x = sum(xs) / len(xs) if xs else 0
        avg_y = sum(ys) / len(ys) if ys else 0
        avg_z = sum(zs) / len(zs) if zs else 0
        
        # Prendi il primo polo come "master" e aggiorna le coordinate
        master = poles[0]
        poles_to_update.append({
            "_id": master["_id"],
            "x": avg_x,
            "y": avg_y,
            "z": avg_z,
        })
        
        # Segna gli altri per la cancellazione
        for pole in poles[1:]:
            poles_to_delete.append(pole["_id"])
        
        print(f"    Keeping: {master['_id']} with avg coords ({avg_x:.4f}, {avg_y:.4f}, {avg_z:.4f})")
        print(f"    Deleting: {len(poles) - 1} duplicates")
    
    # Esegui gli aggiornamenti
    print(f"\n--- Applying changes ---")
    
    for update in poles_to_update:
        poles_coll.update_one(
            {"_id": update["_id"]},
            {"$set": {"x": update["x"], "y": update["y"], "z": update["z"]}}
        )
    print(f"Updated {len(poles_to_update)} master poles with averaged coordinates")
    
    # Cancella i duplicati
    if poles_to_delete:
        result = poles_coll.delete_many({"_id": {"$in": poles_to_delete}})
        print(f"Deleted {result.deleted_count} duplicate poles")
    
    # Verifica finale
    final_count = poles_coll.count_documents({})
    print(f"\nFinal pole count: {final_count}")
    
    client.close()


if __name__ == "__main__":
    run_consolidation()
