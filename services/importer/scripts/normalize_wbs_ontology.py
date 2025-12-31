import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from bson import ObjectId
from dotenv import load_dotenv
import pymongo

ROOT = Path(__file__).resolve().parents[3]
ENV_PATH = ROOT / '.env'


def load_env() -> Tuple[str, Optional[str]]:
    load_dotenv(ENV_PATH)
    mongo_uri = os.getenv('MONGODB_URI')
    mongo_db = os.getenv('MONGODB_DBNAME')
    if not mongo_uri:
        mongo_uri = 'mongodb://localhost:27017/taboolo'
    return mongo_uri, mongo_db


def as_object_id(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return value
    if isinstance(value, str):
        try:
            return ObjectId(value)
        except Exception:
            return value
    return value


def meaningful_value(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, list):
        return any(meaningful_value(v) for v in value)
    return True


def extract_property_keys(extracted: Any, min_confidence: float) -> List[str]:
    if not isinstance(extracted, dict):
        return []
    keys: List[str] = []
    for key, slot in extracted.items():
        if isinstance(slot, dict):
            value = slot.get('value')
            confidence = float(slot.get('confidence', 0.0) or 0.0)
            if confidence < min_confidence:
                continue
            if not meaningful_value(value):
                continue
            keys.append(key)
        else:
            if meaningful_value(slot):
                keys.append(key)
    return keys


def load_ontology(path: Path) -> Tuple[Dict[str, str], Dict[str, Dict[str, str]], Dict[str, Dict[str, str]]]:
    data = json.loads(path.read_text(encoding='utf-8'))
    wbs6_map: Dict[str, str] = {}
    wbs7_map: Dict[str, Dict[str, str]] = {}
    wbs8_map: Dict[str, Dict[str, str]] = {}
    for w6 in data:
        w6_code = w6.get('code')
        w6_name = w6.get('name')
        if not w6_code:
            continue
        wbs6_map[w6_code] = w6_name or ''
        for w7 in w6.get('children') or []:
            w7_code = w7.get('code')
            w7_name = w7.get('name')
            if not w7_code:
                continue
            wbs7_map[w7_code] = {'name': w7_name or '', 'parent': w6_code}
            for w8 in w7.get('children') or []:
                w8_code = w8.get('code')
                w8_name = w8.get('name')
                if not w8_code:
                    continue
                wbs8_map[w8_code] = {'name': w8_name or '', 'parent': w7_code}
    return wbs6_map, wbs7_map, wbs8_map


def category_for_level(level: int) -> str:
    return f'wbs0{level}'.replace('wbs00', 'wbs0')[-5:]


def main() -> None:
    parser = argparse.ArgumentParser(description='Normalize WBS nodes and enrich items using ontology.json')
    parser.add_argument('--ontology', default=str(ROOT / 'ontology.json'))
    parser.add_argument('--min-confidence', type=float, default=0.0)
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    ontology_path = Path(args.ontology)
    if not ontology_path.exists():
        raise SystemExit(f'Ontology file not found: {ontology_path}')

    wbs6_map, wbs7_map, wbs8_map = load_ontology(ontology_path)

    mongo_uri, mongo_db = load_env()
    client = pymongo.MongoClient(mongo_uri, connectTimeoutMS=30000)
    try:
        db = client[mongo_db] if mongo_db else client.get_default_database()
    except Exception:
        db = client.taboolo

    wbs_coll = db.wbsnodes if 'wbsnodes' in db.list_collection_names() else db.wbsnode
    pl_coll = db.pricelistitems
    est_coll = db.estimateitems

    # Load existing WBS nodes (levels 6-8)
    existing_nodes = list(wbs_coll.find({'level': {'$in': [6, 7, 8]}}))
    id_info: Dict[str, Dict[str, Any]] = {}
    by_key: Dict[Tuple[str, str, int, str], ObjectId] = {}
    ancestors_by_id: Dict[str, List[ObjectId]] = {}

    for node in existing_nodes:
        node_id = node.get('_id')
        node_id_str = str(node_id)
        project_id = str(node.get('project_id', ''))
        estimate_id = str(node.get('estimate_id', ''))
        level = int(node.get('level') or 0)
        code = str(node.get('code') or '')
        id_info[node_id_str] = {
            'code': code,
            'level': level,
            'project_id': project_id,
            'estimate_id': estimate_id,
            'description': node.get('description') or '',
        }
        if project_id and estimate_id and code:
            by_key[(project_id, estimate_id, level, code)] = node_id
        ancestors_by_id[node_id_str] = list(node.get('ancestors') or [])

    def ensure_node(
        project_id: Any,
        estimate_id: Any,
        level: int,
        code: str,
        description: str,
        parent_id: Optional[ObjectId] = None,
    ) -> ObjectId:
        project_id_str = str(project_id)
        estimate_id_str = str(estimate_id)
        key = (project_id_str, estimate_id_str, level, code)
        expected_category = category_for_level(level)
        expected_type = 'commodity'

        if key in by_key:
            node_id = by_key[key]
            node_id_str = str(node_id)
            update: Dict[str, Any] = {}
            if description and id_info[node_id_str]['description'] != description:
                update['description'] = description
                update['normalized_description'] = description
            if parent_id is not None:
                current_parent = wbs_coll.find_one({'_id': node_id}, {'parent_id': 1})
                if current_parent and current_parent.get('parent_id') != parent_id:
                    update['parent_id'] = parent_id
                    parent_ancestors = ancestors_by_id.get(str(parent_id), [])
                    update['ancestors'] = parent_ancestors + [parent_id]
            update['type'] = expected_type
            update['category'] = expected_category
            update['level'] = level
            if update and not args.dry_run:
                wbs_coll.update_one({'_id': node_id}, {'$set': update})
            if update:
                id_info[node_id_str]['description'] = description
                id_info[node_id_str]['level'] = level
            return node_id

        doc: Dict[str, Any] = {
            'project_id': as_object_id(project_id),
            'estimate_id': as_object_id(estimate_id),
            'type': expected_type,
            'level': level,
            'category': expected_category,
            'code': code,
            'description': description,
            'normalized_description': description,
        }
        if parent_id is not None:
            parent_ancestors = ancestors_by_id.get(str(parent_id), [])
            doc['parent_id'] = parent_id
            doc['ancestors'] = parent_ancestors + [parent_id]
            if level == 7:
                doc['wbs6_id'] = parent_id
        if args.dry_run:
            node_id = ObjectId()
        else:
            node_id = wbs_coll.insert_one(doc).inserted_id
        by_key[key] = node_id
        node_id_str = str(node_id)
        id_info[node_id_str] = {
            'code': code,
            'level': level,
            'project_id': project_id_str,
            'estimate_id': estimate_id_str,
            'description': description,
        }
        ancestors_by_id[node_id_str] = doc.get('ancestors', [])
        return node_id

    # Normalize existing WBS nodes by ontology
    node_updates = 0
    for node in existing_nodes:
        code = str(node.get('code') or '')
        level = node.get('level')
        if code in wbs8_map:
            expected_desc = wbs8_map[code]['name']
            expected_level = 8
        elif code in wbs7_map:
            expected_desc = wbs7_map[code]['name']
            expected_level = 7
        elif code in wbs6_map:
            expected_desc = wbs6_map[code]
            expected_level = 6
        else:
            continue

        update: Dict[str, Any] = {}
        if expected_desc and (node.get('description') or '') != expected_desc:
            update['description'] = expected_desc
            update['normalized_description'] = expected_desc
        if expected_level and node.get('level') != expected_level:
            update['level'] = expected_level
        update['type'] = 'commodity'
        update['category'] = category_for_level(expected_level)
        if update:
            node_updates += 1
            if not args.dry_run:
                wbs_coll.update_one({'_id': node['_id']}, {'$set': update})

    # Build quick lookup for wbs8 property keys by wbs7
    wbs8_by_wbs7: Dict[str, Dict[str, str]] = {}
    for code, info in wbs8_map.items():
        wbs7_code = info['parent']
        key = info['name']
        if not wbs7_code or not key:
            continue
        wbs8_by_wbs7.setdefault(wbs7_code, {})[key] = code

    item_updates = 0
    wbs8_created = 0

    def update_items(coll, id_field: str, project_field: str, estimate_field: str) -> None:
        nonlocal item_updates, wbs8_created
        cursor = coll.find({}, {
            'wbs_ids': 1,
            'extracted_properties': 1,
            project_field: 1,
            estimate_field: 1,
        })

        bulk_ops = []
        for item in cursor:
            wbs_ids = item.get('wbs_ids') or []
            if not wbs_ids:
                continue
            project_id = item.get(project_field)
            estimate_id = item.get(estimate_field)
            if not project_id or not estimate_id:
                continue

            wbs6_code = None
            wbs7_code = None
            for wbs_id in wbs_ids:
                info = id_info.get(str(wbs_id))
                if not info:
                    continue
                if info['level'] == 6 and not wbs6_code:
                    wbs6_code = info['code']
                if info['level'] == 7 and not wbs7_code:
                    wbs7_code = info['code']

            new_ids: Set[str] = set(str(w) for w in wbs_ids)

            wbs6_id = None
            if wbs6_code and wbs6_code in wbs6_map:
                wbs6_id = ensure_node(project_id, estimate_id, 6, wbs6_code, wbs6_map[wbs6_code])
                new_ids.add(str(wbs6_id))

            wbs7_id = None
            if wbs7_code and wbs7_code in wbs7_map:
                parent_code = wbs7_map[wbs7_code]['parent']
                if parent_code:
                    wbs6_id = wbs6_id or ensure_node(project_id, estimate_id, 6, parent_code, wbs6_map.get(parent_code, parent_code))
                wbs7_id = ensure_node(project_id, estimate_id, 7, wbs7_code, wbs7_map[wbs7_code]['name'], parent_id=wbs6_id)
                new_ids.add(str(wbs7_id))

            if wbs7_code and wbs7_id and wbs7_code in wbs8_by_wbs7:
                props = extract_property_keys(item.get('extracted_properties'), args.min_confidence)
                for prop_key in props:
                    wbs8_code = wbs8_by_wbs7[wbs7_code].get(prop_key)
                    if not wbs8_code:
                        continue
                    wbs8_id = ensure_node(
                        project_id,
                        estimate_id,
                        8,
                        wbs8_code,
                        wbs8_map[wbs8_code]['name'],
                        parent_id=wbs7_id,
                    )
                    if str(wbs8_id) not in new_ids:
                        wbs8_created += 1
                    new_ids.add(str(wbs8_id))

            if new_ids != set(str(w) for w in wbs_ids):
                item_updates += 1
                updated_ids = [as_object_id(x) for x in new_ids]
                if not args.dry_run:
                    bulk_ops.append(
                        pymongo.UpdateOne(
                            {'_id': item[id_field]},
                            {'$set': {'wbs_ids': updated_ids}},
                        )
                    )

            if len(bulk_ops) >= 500:
                if bulk_ops and not args.dry_run:
                    coll.bulk_write(bulk_ops, ordered=False)
                bulk_ops = []

        if bulk_ops and not args.dry_run:
            coll.bulk_write(bulk_ops, ordered=False)

    update_items(pl_coll, '_id', 'project_id', 'estimate_id')
    update_items(est_coll, '_id', 'project_id', 'project.estimate_id')

    # Build poles for WBS6/7/8 using item map2d/map3d
    pole_types = {6: 'wbs6', 7: 'wbs7', 8: 'wbs8'}
    poles_by_level: Dict[int, Dict[str, Dict[str, Any]]] = {6: {}, 7: {}, 8: {}}

    for item in pl_coll.find({'map2d': {'$exists': True}, 'map3d': {'$exists': True}}, {'wbs_ids': 1, 'map2d': 1, 'map3d': 1}):
        map2d = item.get('map2d') or {}
        map3d = item.get('map3d') or {}
        if 'x' not in map2d or 'y' not in map2d or 'x' not in map3d or 'y' not in map3d or 'z' not in map3d:
            continue
        for wbs_id in item.get('wbs_ids') or []:
            info = id_info.get(str(wbs_id))
            if not info:
                continue
            level = info['level']
            if level not in poles_by_level:
                continue
            code = info['code']
            desc = ''
            parent_wbs6 = None
            parent_wbs7 = None
            if level == 6:
                desc = wbs6_map.get(code, info.get('description', ''))
            elif level == 7:
                desc = wbs7_map.get(code, {}).get('name', info.get('description', ''))
                parent_wbs6 = wbs7_map.get(code, {}).get('parent')
            elif level == 8:
                desc = wbs8_map.get(code, {}).get('name', info.get('description', ''))
                parent_wbs7 = wbs8_map.get(code, {}).get('parent')
                parent_wbs6 = wbs7_map.get(parent_wbs7, {}).get('parent') if parent_wbs7 else None

            bucket = poles_by_level[level].setdefault(code, {
                'count': 0,
                'sum_x2': 0.0,
                'sum_y2': 0.0,
                'sum_x3': 0.0,
                'sum_y3': 0.0,
                'sum_z3': 0.0,
                'description': desc,
                'parent_wbs6': parent_wbs6,
                'parent_wbs7': parent_wbs7,
            })
            bucket['count'] += 1
            bucket['sum_x2'] += float(map2d['x'])
            bucket['sum_y2'] += float(map2d['y'])
            bucket['sum_x3'] += float(map3d['x'])
            bucket['sum_y3'] += float(map3d['y'])
            bucket['sum_z3'] += float(map3d['z'])

    poles_coll = db.semantic_poles
    now = datetime.now(timezone.utc)

    for level, type_name in pole_types.items():
        if not args.dry_run:
            poles_coll.delete_many({'type': type_name})

    poles_docs: List[Dict[str, Any]] = []
    for level, bucket_map in poles_by_level.items():
        type_name = pole_types[level]
        for code, data in bucket_map.items():
            if data['count'] <= 0:
                continue
            x2 = data['sum_x2'] / data['count']
            y2 = data['sum_y2'] / data['count']
            x3 = data['sum_x3'] / data['count']
            y3 = data['sum_y3'] / data['count']
            z3 = data['sum_z3'] / data['count']
            doc = {
                'project_id': 'GLOBAL_MULTI_PROJECT',
                'type': type_name,
                'level': level,
                'code': code,
                'description': data['description'],
                'map2d': {'x': x2, 'y': y2},
                'map3d': {'x': x3, 'y': y3, 'z': z3},
                'x': x2,
                'y': y2,
                'z': z3,
                'updated_at': now,
            }
            if level == 6:
                doc['wbs6'] = code
            if data.get('parent_wbs6'):
                doc['parent_wbs6'] = data['parent_wbs6']
            if data.get('parent_wbs7'):
                doc['parent_wbs7'] = data['parent_wbs7']
            poles_docs.append(doc)

    if poles_docs and not args.dry_run:
        poles_coll.insert_many(poles_docs)

    print('WBS node updates:', node_updates)
    print('Items updated:', item_updates)
    print('WBS8 nodes added to items:', wbs8_created)
    print('Poles created:', len(poles_docs))


if __name__ == '__main__':
    main()
