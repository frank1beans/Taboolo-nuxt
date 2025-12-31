import argparse
import csv
import json
import os
import re
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

from dotenv import load_dotenv
import pymongo

ROOT = Path(__file__).resolve().parents[3]
ENV_PATH = ROOT / '.env'


def load_env() -> Tuple[str, Optional[str]]:
    load_dotenv(ENV_PATH)
    mongo_uri = os.getenv('MONGODB_URI')
    mongo_db = os.getenv('MONGODB_DBNAME')
    if not mongo_uri:
        raise SystemExit('MONGODB_URI not set')
    return mongo_uri, mongo_db


def normalize_desc(desc: str, code: str = '') -> str:
    if not desc:
        return ''
    text = desc.strip()
    if code:
        pattern = r'^' + re.escape(code) + r'\s*[-:–—]\s*'
        text = re.sub(pattern, '', text, flags=re.IGNORECASE)
    text = re.sub(r'^[A-Z]\d{3}(?:\.\d{3}){0,2}\s*[-:–—]\s*', '', text)
    text = re.sub(r'\s+', ' ', text).strip().lower()
    return text


def load_ontology(path: Path) -> Tuple[Dict[str, str], Dict[str, str]]:
    data = json.loads(path.read_text(encoding='utf-8'))
    wbs6_map: Dict[str, str] = {}
    wbs7_map: Dict[str, str] = {}
    for w6 in data:
        code6 = (w6.get('code') or '').strip()
        name6 = w6.get('name') or ''
        if code6:
            wbs6_map[code6] = name6
        for w7 in w6.get('children') or []:
            code7 = (w7.get('code') or '').strip()
            name7 = w7.get('name') or ''
            if code7:
                wbs7_map[code7] = name7
    return wbs6_map, wbs7_map


def load_mappings(csv_path: Path) -> List[Dict[str, str]]:
    mappings: List[Dict[str, str]] = []
    with csv_path.open('r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            mappings.append({
                'level': row.get('level', '').strip(),
                'description_key': row.get('description_key', '').strip(),
                'canonical_code': row.get('canonical_code', '').strip(),
                'alias_code': row.get('alias_code', '').strip(),
            })
    return mappings


def chunked(iterable: Iterable, size: int) -> Iterable[List]:
    batch: List = []
    for item in iterable:
        batch.append(item)
        if len(batch) >= size:
            yield batch
            batch = []
    if batch:
        yield batch


def main() -> None:
    parser = argparse.ArgumentParser(description='Deduplicate WBS codes by mapping aliases to ontology codes.')
    parser.add_argument('--mappings', default=str(ROOT / 'reports' / 'wbs_dedup_mappings.csv'))
    parser.add_argument('--ontology', default=str(ROOT / 'ontology.json'))
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--ambiguous-code', default='A020.090', help='Canonical code for the ambiguous group.')
    args = parser.parse_args()

    mappings_path = Path(args.mappings)
    ontology_path = Path(args.ontology)

    if not mappings_path.exists():
        raise SystemExit(f'Mappings file not found: {mappings_path}')
    if not ontology_path.exists():
        raise SystemExit(f'Ontology file not found: {ontology_path}')

    wbs6_map, wbs7_map = load_ontology(ontology_path)
    mappings = load_mappings(mappings_path)

    # Manual resolution for the only ambiguous group.
    if args.ambiguous_code:
        mappings.append({
            'level': '7',
            'description_key': "botole d'ispezione e accessori",
            'canonical_code': args.ambiguous_code.strip(),
            'alias_code': 'L020.090',
        })

    mongo_uri, mongo_db = load_env()
    client = pymongo.MongoClient(mongo_uri, connectTimeoutMS=30000)
    try:
        db = client[mongo_db] if mongo_db else client.get_default_database()
    except Exception:
        db = client.get_database('test')

    wbs_coll = db.wbsnodes if 'wbsnodes' in db.list_collection_names() else db.wbsnode

    updates = []
    matched = 0
    skipped = 0

    for entry in mappings:
        level = int(entry['level'])
        desc_key = entry['description_key']
        canonical_code = entry['canonical_code']
        alias_code = entry['alias_code']

        if level == 6:
            canonical_name = wbs6_map.get(canonical_code)
        else:
            canonical_name = wbs7_map.get(canonical_code)

        if not canonical_name:
            skipped += 1
            continue

        cursor = wbs_coll.find({'level': level, 'code': alias_code}, {
            '_id': 1,
            'code': 1,
            'description': 1,
            'normalized_description': 1,
        })

        for doc in cursor:
            raw_desc = doc.get('normalized_description') or doc.get('description') or ''
            node_key = normalize_desc(raw_desc, alias_code)
            if node_key != desc_key:
                skipped += 1
                continue
            matched += 1
            updates.append(pymongo.UpdateOne(
                {'_id': doc['_id']},
                {'$set': {
                    'code': canonical_code,
                    'description': canonical_name,
                    'normalized_description': canonical_name,
                }}
            ))

    updated = 0
    if updates and args.apply:
        for batch in chunked(updates, 500):
            result = wbs_coll.bulk_write(batch, ordered=False)
            updated += result.modified_count

    # Normalize descriptions for canonical codes (levels 6/7).
    desc_updates = 0
    if args.apply:
        for level, code_map in ((6, wbs6_map), (7, wbs7_map)):
            cursor = wbs_coll.find({'level': level, 'code': {'$in': list(code_map.keys())}}, {
                '_id': 1,
                'code': 1,
                'description': 1,
                'normalized_description': 1,
            })
            ops = []
            for doc in cursor:
                code = doc.get('code') or ''
                canonical_name = code_map.get(code)
                if not canonical_name:
                    continue
                current = doc.get('description') or ''
                current_norm = doc.get('normalized_description') or ''
                if current == canonical_name and current_norm == canonical_name:
                    continue
                ops.append(pymongo.UpdateOne(
                    {'_id': doc['_id']},
                    {'$set': {
                        'description': canonical_name,
                        'normalized_description': canonical_name,
                    }}
                ))
            for batch in chunked(ops, 500):
                result = wbs_coll.bulk_write(batch, ordered=False)
                desc_updates += result.modified_count

    client.close()

    print('Dry run:', not args.apply)
    print('Mappings processed:', len(mappings))
    print('Alias nodes matched:', matched)
    print('Alias nodes updated:', updated if args.apply else 0)
    print('Alias nodes skipped:', skipped)
    print('Canonical description updates:', desc_updates if args.apply else 0)


if __name__ == '__main__':
    main()
