"""
SIX File Import Endpoint
Parses .six/.xml files and transforms to database schema.
"""

import os
from fastapi import APIRouter, File, UploadFile, HTTPException, Form

from application.process_file import process_file_content
from loader import LoaderService
from api.endpoints.shared import ImportResult, compute_embeddings_for_items, get_used_pli_ids
from core import settings

router = APIRouter()


@router.post("/{commessa_id}/import-six", response_model=ImportResult)
async def import_six(
    commessa_id: str,
    file: UploadFile = File(...),
    preventivo_id: str = Form(None),
    compute_embeddings: bool = Form(False),
    extract_properties: bool = Form(False),
    use_weighted_props: bool = Form(False),
    use_two_pass_embedding: bool = Form(True),
    props_replication_k: int = Form(3),
    base_weight: float = Form(0.4),
    detail_weight: float = Form(0.6),
):
    """
    Parses a SIX file and transforms it into the new Database Scheme.
    Returns the objects that would be saved to MongoDB.
    """
    if not file.filename or not file.filename.lower().endswith((".six", ".xml")):
        raise HTTPException(400, "File must be .six or .xml")
    
    content = await file.read()
    if len(content) > settings.max_upload_size_mb * 1024 * 1024:
        raise HTTPException(413, "File too large")
    
    try:
        # 1. Parse using Domain Logic (SixParser)
        normalized = process_file_content(content, "six", filename=file.filename)
        
        # 2. Transform using LoaderService
        project, groups, price_list, estimate = LoaderService.transform(
            normalized, 
            project_id=commessa_id,
            preventivo_id=preventivo_id,
            extract_properties=extract_properties,
        )

        # 3. Compute Embeddings (if requested)
        if compute_embeddings and price_list.items:
            used_pli_ids = get_used_pli_ids(estimate)
            compute_embeddings_for_items(
                price_list=price_list,
                used_pli_ids=used_pli_ids if used_pli_ids else None,
                extract_properties=extract_properties,
                base_weight=base_weight,
                detail_weight=detail_weight,
                use_weighted_props=use_weighted_props,
                use_two_pass_embedding=use_two_pass_embedding,
                props_replication_k=props_replication_k,
            )
        
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
    if len(content) > settings.max_upload_size_mb * 1024 * 1024:
        raise HTTPException(413, "File too large")
    
    try:
        # Parse using Domain Logic
        print(f"DEBUG Endpoint: Processing preview for {file.filename}")
        normalized = process_file_content(content, "six", filename=file.filename)
        print(f"DEBUG Endpoint: Normalized result has {len(normalized.preventivi)} preventivi")
        
        # Use Preview Service
        from ingestion.preview import PreviewService
        return PreviewService.generate_summary(normalized)

    except Exception as e:
        raise HTTPException(400, f"Preview error: {str(e)}")

