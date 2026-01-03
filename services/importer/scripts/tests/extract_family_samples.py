import json
import os
import random
import re
import sys
from typing import Any, Dict, List

import pymongo
from dotenv import load_dotenv


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
IMPORTER_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
PROJECT_ROOT = os.path.abspath(os.path.join(IMPORTER_DIR, "..", ".."))
if IMPORTER_DIR not in sys.path:
    sys.path.append(IMPORTER_DIR)

from embedding.extraction.families.registry import WBS6_FAMILY_SIGNALS


def _compile(patterns: List[str]) -> List[re.Pattern]:
    return [re.compile(p, re.IGNORECASE) for p in patterns]


def _matches(text: str, primary: List[re.Pattern], negative: List[re.Pattern]) -> bool:
    if not text:
        return False
    lowered = text.lower()
    if not any(p.search(lowered) for p in primary):
        return False
    if any(p.search(lowered) for p in negative):
        return False
    return True


def _get_db(client: pymongo.MongoClient):
    try:
        db = client.get_database()
    except Exception:
        db = client.get_database("test")
    return db


def _get_collection(db):
    if "pricelistitems" in db.list_collection_names():
        return db.pricelistitems
    return db.pricelistitem


def _pick_text(doc: Dict[str, Any]) -> str:
    return (
        doc.get("extended_description")
        or doc.get("long_description")
        or doc.get("description")
        or ""
    )


def _fetch_candidates(
    coll,
    primary_regex: str,
    sample_size: int,
    oversample_factor: int,
) -> List[Dict[str, Any]]:
    pipeline = [
        {
            "$match": {
                "$or": [
                    {"wbs6": {"$exists": True, "$ne": None}},
                    {"wbs_ids": {"$exists": True, "$ne": []}},
                ]
            }
        },
        {
            "$lookup": {
                "from": "wbsnodes",
                "localField": "wbs_ids",
                "foreignField": "_id",
                "as": "wbs_nodes",
            }
        },
        {
            "$addFields": {
                "wbs06_node": {
                    "$filter": {
                        "input": "$wbs_nodes",
                        "as": "wbs",
                        "cond": {
                            "$regexMatch": {
                                "input": {"$ifNull": ["$$wbs.type", ""]},
                                "regex": "WBS 0?6",
                                "options": "i",
                            }
                        },
                    }
                }
            }
        },
        {
            "$addFields": {
                "wbs6_text": {
                    "$ifNull": ["$wbs6", {"$arrayElemAt": ["$wbs06_node.description", 0]}]
                }
            }
        },
        {"$match": {"wbs6_text": {"$regex": primary_regex, "$options": "i"}}},
        {"$sample": {"size": sample_size * oversample_factor}},
        {
            "$project": {
                "code": 1,
                "description": 1,
                "long_description": 1,
                "extended_description": 1,
                "wbs6_text": 1,
            }
        },
    ]
    return list(coll.aggregate(pipeline))


def main() -> None:
    load_dotenv(os.path.join(PROJECT_ROOT, ".env"))
    mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/test")
    sample_per_family = int(os.getenv("SAMPLE_PER_FAMILY", "20"))
    oversample_factor = int(os.getenv("SAMPLE_OVERSAMPLE", "6"))
    families_env = os.getenv("SAMPLE_FAMILIES")

    all_families = list(WBS6_FAMILY_SIGNALS.keys())
    families = all_families
    if families_env:
        families = [f.strip() for f in families_env.split(",") if f.strip()]
    else:
        families = [f for f in all_families if f != "cartongesso"]

    client = pymongo.MongoClient(mongo_uri)
    db = _get_db(client)
    coll = _get_collection(db)

    output: Dict[str, Any] = {
        "metadata": {
            "sample_per_family": sample_per_family,
            "oversample_factor": oversample_factor,
            "collection": coll.name,
        },
        "families": {},
    }

    for family in families:
        signals = WBS6_FAMILY_SIGNALS.get(family, {})
        primary = _compile(signals.get("primary", []))
        negative = _compile(signals.get("negative", []))

        if not primary:
            continue

        primary_regex = "(" + "|".join(signals.get("primary", [])) + ")"
        candidates = _fetch_candidates(coll, primary_regex, sample_per_family, oversample_factor)

        filtered = []
        for doc in candidates:
            wbs6_text = doc.get("wbs6_text") or ""
            if not _matches(wbs6_text, primary, negative):
                continue
            text = _pick_text(doc)
            if len(text.strip()) < 20:
                continue
            filtered.append(
                {
                    "id": str(doc.get("_id")),
                    "code": doc.get("code"),
                    "wbs6": wbs6_text,
                    "description": text,
                }
            )

        random.shuffle(filtered)
        output["families"][family] = filtered[:sample_per_family]

    output_path = os.path.join(IMPORTER_DIR, "scripts", "benchmark_data", "db_family_samples.json")
    with open(output_path, "w", encoding="utf-8") as handle:
        json.dump(output, handle, indent=2, ensure_ascii=False)

    print(f"Saved samples to {output_path}")
    for family, items in output["families"].items():
        print(f"{family}: {len(items)}")


if __name__ == "__main__":
    main()

