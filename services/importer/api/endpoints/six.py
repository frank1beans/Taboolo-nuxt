import os

from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from typing import List
from pydantic import BaseModel

from application.process_file import process_file_content
from loader import LoaderService
from infrastructure.dto import Project, WbsNode, PriceList, Estimate

router = APIRouter()

class ImportResult(BaseModel):
    project: Project
    groups: List[WbsNode]
    price_list: PriceList
    estimate: Estimate

@router.post("/{commessa_id}/import-six", response_model=ImportResult)
async def import_six(
    commessa_id: str,
    file: UploadFile = File(...),
    preventivo_id: str = Form(None), # Optional filter
    compute_embeddings: bool = Form(False),
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


        # 3. Compute Embeddings (if requested)
        if compute_embeddings and price_list.items:
            try:
                from logic.embedding import get_embedder
                embedder = get_embedder()
                
                # Prepare texts (description + long_description or just description)
                # We use long_description if possible, else description
                texts = []
                # DEBUG LOG
                with open("debug_embeddings.log", "a") as f:
                    f.write(f"Compute Embeddings Flag: {compute_embeddings}\n")
                    f.write(f"Jina Key in Env: {'JINA_API_KEY' in os.environ}\n")

                # 3a. Consolidate used PriceListItems
                used_pli_ids = set()
                # Estimate Items use price_list_item_id
                if estimate.items:
                    for est_item in estimate.items:
                        # pydantic model, access by attribute
                        if est_item.price_list_item_id:
                            used_pli_ids.add(est_item.price_list_item_id)

                # Filter items to embed
                items_to_embed = []
                indices_map = [] # To map back to original price_list.items index

                for idx, item in enumerate(price_list.items):
                    # Check if item is used (by ID) - assuming ID matches (it should as per loader)
                    if item.id in used_pli_ids:
                        text = item.long_description or item.description
                        if text:
                            items_to_embed.append(text)
                            indices_map.append(idx)

                print(f"Computing embeddings for {len(items_to_embed)} used items (out of {len(price_list.items)} total)...")
                
                if items_to_embed:
                    vectors = embedder.compute_embeddings(items_to_embed)
                    
                    # Assign back to items using the map
                    if len(vectors) == len(items_to_embed):
                        count = 0
                        for i, vector in enumerate(vectors):
                            if vector:
                                original_idx = indices_map[i]
                                price_list.items[original_idx].embedding = vector
                                count += 1
                        print(f"Embeddings generated and assigned for {count} items.")
                    else:
                        print("Warning: Embedding count mismatch. Skipping assignment.")
                else:
                    print("No used items found to embed.")

            except Exception as e:
                print(f"Embedding generation failed: {e}")
                import traceback
                traceback.print_exc()
                # Non-blocking error - proceed with import
        
        # DEBUG: Log sample of price_list.items to verify long_description
        if price_list.items:
            for i, pli in enumerate(price_list.items[:3]):
                print(f"[DEBUG Python] PLI #{i}: code={pli.code[:30] if pli.code else ''}, "
                      f"desc={pli.description[:30] if pli.description else ''}, "
                      f"long_desc={pli.long_description[:50] if pli.long_description else 'EMPTY'}")
        
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

@router.post("/{commessa_id}/import-six/preview")
async def preview_six(
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
