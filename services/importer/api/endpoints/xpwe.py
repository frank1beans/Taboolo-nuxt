import json
from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from typing import List, Dict, Optional
from pydantic import BaseModel

from domain import process_file_content
from loader import LoaderService
from schemas.models import Project, WbsNode, PriceList, Estimate
from parsers.shared.wbs_constants import CANONICAL_WBS_LEVELS

router = APIRouter()

class ImportResult(BaseModel):
    project: Project
    groups: List[WbsNode]
    price_list: PriceList
    estimate: Estimate

@router.post("/{commessa_id}/import-xpwe/raw", response_model=ImportResult)
async def import_xpwe_raw(
    commessa_id: str,
    file: UploadFile = File(...),
    preventivo_id: str = Form(None),
    wbs_mapping: str = Form(None), # JSON string: {"SuperCategorie": "01", ...}
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
            try:
                raw_mapping = json.loads(wbs_mapping)
                print(f"DEBUG: Received WBS Mapping: {raw_mapping}", flush=True)
                
                # Normalize mapping keys to lowercase for robust matching
                mapping_dict = {k.lower(): v for k, v in raw_mapping.items()}

                for node in normalized.wbs_nodes:
                    # Robust lookup: clean parser type just in case
                    n_type = (node.type or "").strip().lower()
                    
                    if n_type in mapping_dict:
                        target_code = mapping_dict[n_type]
                        
                        # DEFENSIVE FIX: Handle case where frontend sends object instead of value
                        if isinstance(target_code, dict):
                             target_code = target_code.get("value")
                        
                        if target_code and target_code in CANONICAL_WBS_LEVELS:
                             # Update level to integer (01 -> 1)
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
                        # Not in mapping -> Hide (suppress default parser levels)
                        # This logic ensures ONLY mapped kinds appear in the tree
                        node.level = 0
            except json.JSONDecodeError:
                print("Invalid WBS mapping JSON", flush=True)

        
        # 3. Transform using LoaderService
        project, groups, price_list, estimate = LoaderService.transform(
            normalized, 
            project_id=commessa_id,
            preventivo_id=preventivo_id
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

@router.post("/{commessa_id}/import-xpwe/raw/preview")
async def preview_xpwe_raw(
    commessa_id: str,
    file: UploadFile = File(...),
):
    """
    Parses a XPWE file and returns a summary for preview.
    """
    # Force Reload Trigger (Parser updated)
    if not file.filename:
        raise HTTPException(400, "Filename required")
    
    content = await file.read()
    
    try:
        # Parse using Domain Logic
        print(f"DEBUG Endpoint: Processing XPWE preview for {file.filename}")
        normalized = process_file_content(content, "xpwe", filename=file.filename)
        
        # 1. Analyze WBS Structure for Mapping UI
        wbs_kinds_found = {} # Kind -> Count
        for node in normalized.wbs_nodes:
            k = node.type or "Unknown"
            wbs_kinds_found[k] = wbs_kinds_found.get(k, 0) + 1
            
        wbs_structure = [
            {"kind": k, "count": c} for k, c in wbs_kinds_found.items()
        ]

        # Map to lightweight preview structure expected by frontend
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
            "wbs_structure": wbs_structure, # New field for UI
            "canonical_levels": CANONICAL_WBS_LEVELS # Send available targets to FE
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(400, f"Preview error: {str(e)}")
