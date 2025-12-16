from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from typing import List
from pydantic import BaseModel

from domain import process_file_content
from loader import LoaderService
from schemas.models import Project, WbsNode, PriceList, Estimate

router = APIRouter()

class ImportResult(BaseModel):
    project: Project
    groups: List[WbsNode]
    price_list: PriceList
    estimate: Estimate

@router.post("/{commessa_id}/import-six/raw", response_model=ImportResult)
async def import_six_raw(
    commessa_id: str,
    file: UploadFile = File(...),
    preventivo_id: str = Form(None), # Optional filter
):
    """
    Parses a SIX file and transforms it into the new Database Scheme.
    Returns the objects that would be saved to MongoDB.
    """
    if not file.filename or not file.filename.lower().endswith((".six", ".xml")):
        raise HTTPException(400, "File must be .six or .xml")
    
    content = await file.read()
    
    try:
        # 1. Parse using Domain Logic (SixParser)
        # We can pass commessa_id as project_id if we want strict binding, 
        # or let the Loader generate one if None.
        normalized = process_file_content(content, "six", filename=file.filename)
        
        # 2. Transform using LoaderService
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

@router.post("/{commessa_id}/import-six/raw/preview")
async def preview_six_raw(
    commessa_id: str,
    file: UploadFile = File(...),
):
    """
    Parses a SIX file and returns a summary for preview.
    Used by frontend to select which Preventivo to import.
    """
    if not file.filename or not file.filename.lower().endswith((".six", ".xml")):
        raise HTTPException(400, "File must be .six or .xml")
    
    content = await file.read()
    
    try:
        # Parse using Domain Logic
        print(f"DEBUG Endpoint: Processing preview for {file.filename}")
        normalized = process_file_content(content, "six", filename=file.filename)
        print(f"DEBUG Endpoint: Normalized result has {len(normalized.preventivi)} preventivi")
        
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
            "estimates": preventivi, # Populate mandatory field
            "preventivi": preventivi,
            "groups_count": len(normalized.wbs_nodes),
            "products_count": len(normalized.price_list_items)
        }

    except Exception as e:
        raise HTTPException(400, f"Preview error: {str(e)}")
