"""
XPWE File Import Endpoint
Parses .xpwe files and transforms to database schema.
"""

import json
from fastapi import APIRouter, File, UploadFile, HTTPException, Form

from application.process_file import process_file_content
from loader import LoaderService
from parsers.shared.wbs_constants import CANONICAL_WBS_LEVELS
from api.endpoints.shared import ImportResult, compute_embeddings_for_items

router = APIRouter()


@router.post("/{commessa_id}/import-xpwe/raw", response_model=ImportResult)
async def import_xpwe_raw(
    commessa_id: str,
    file: UploadFile = File(...),
    preventivo_id: str = Form(None),
    wbs_mapping: str = Form(None),  # JSON string: {"SuperCategorie": "01", ...}
    compute_embeddings: bool = Form(False),
    extract_properties: bool = Form(False),
    use_weighted_props: bool = Form(False),
    use_two_pass_embedding: bool = Form(True),
    props_replication_k: int = Form(3),
    base_weight: float = Form(0.4),
    detail_weight: float = Form(0.6),
):
    """
    Parses a XPWE file and transforms it into the new Database Scheme.
    """
    if not file.filename:
        raise HTTPException(400, "Filename required")
    
    content = await file.read()
    
    try:
        # 1. Parse using Domain Logic
        normalized = process_file_content(content, "xpwe", filename=file.filename)

        # 2. Apply WBS Mapping if provided
        if wbs_mapping:
            _apply_wbs_mapping(normalized, wbs_mapping)
        
        # 3. Transform using LoaderService
        project, groups, price_list, estimate = LoaderService.transform(
            normalized, 
            project_id=commessa_id,
            preventivo_id=preventivo_id,
            extract_properties=extract_properties,
        )

        # 4. Compute Embeddings (if requested)
        if compute_embeddings and price_list.items:
            compute_embeddings_for_items(
                price_list=price_list,
                used_pli_ids=None,  # Embed all items for XPWE
                extract_properties=extract_properties,
                base_weight=base_weight,
                detail_weight=detail_weight,
                use_weighted_props=use_weighted_props,
                use_two_pass_embedding=use_two_pass_embedding,
                props_replication_k=props_replication_k,
            )
        
        return ImportResult(
            project=project,
            groups=groups,
            price_list=price_list,
            estimate=estimate
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(400, f"Import error: {str(e)}")


def _apply_wbs_mapping(normalized, wbs_mapping_json: str):
    """Apply WBS level mapping from frontend configuration."""
    try:
        raw_mapping = json.loads(wbs_mapping_json)
        print(f"DEBUG: Received WBS Mapping: {raw_mapping}", flush=True)
        
        # Normalize mapping keys to lowercase for robust matching
        mapping_dict = {k.lower(): v for k, v in raw_mapping.items()}

        for node in normalized.wbs_nodes:
            n_type = (node.type or "").strip().lower()
            
            if n_type in mapping_dict:
                target_code = mapping_dict[n_type]
                
                # Handle case where frontend sends object instead of value
                if isinstance(target_code, dict):
                    target_code = target_code.get("value")
                
                if target_code and target_code in CANONICAL_WBS_LEVELS:
                    try:
                        new_level = int(target_code)
                        node.level = new_level
                        node.type = CANONICAL_WBS_LEVELS[target_code]["description"]
                    except ValueError:
                        pass
                else:
                    # Mapped to empty or invalid -> Hide
                    node.level = 0
            else:
                # Not in mapping -> Hide
                node.level = 0
                
    except json.JSONDecodeError:
        print("Invalid WBS mapping JSON", flush=True)


@router.post("/{commessa_id}/import-xpwe/raw/preview")
async def preview_xpwe_raw(
    commessa_id: str,
    file: UploadFile = File(...),
):
    """
    Parses a XPWE file and returns a summary for preview.
    """
    if not file.filename:
        raise HTTPException(400, "Filename required")
    
    content = await file.read()
    
    try:
        print(f"DEBUG Endpoint: Processing XPWE preview for {file.filename}")
        normalized = process_file_content(content, "xpwe", filename=file.filename)
        
        # Analyze WBS Structure for Mapping UI
        wbs_kinds_found = {}
        for node in normalized.wbs_nodes:
            k = node.type or "Unknown"
            wbs_kinds_found[k] = wbs_kinds_found.get(k, 0) + 1
            
        wbs_structure = [
            {"kind": k, "count": c} for k, c in wbs_kinds_found.items()
        ]

        # Map to lightweight preview structure
        preventivi = []
        for p in normalized.preventivi:
            preventivi.append({
                "preventivoId": p.id,
                "code": p.code,
                "description": p.name or p.code,
                "stats": {
                    "items": len(p.measurements)
                }
            })
            
        return {
            "estimates": preventivi, 
            "preventivi": preventivi,
            "groups_count": len(normalized.wbs_nodes),
            "products_count": len(normalized.price_list_items),
            "wbs_structure": wbs_structure,
            "canonical_levels": CANONICAL_WBS_LEVELS
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(400, f"Preview error: {str(e)}")
