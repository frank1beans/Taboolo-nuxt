import os

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import logging

from logic.extraction.router import FamilyRouter
from logic.extraction.llm_extractor import LLMExtractor
from logic.extraction.schemas.core import CoreProperties
from logic.extraction.schemas.cartongesso import CartongessoProperties
from logic.extraction.schemas.serramenti import SerramentiProperties
from logic.extraction.schemas.pavimenti import PavimentiProperties
from logic.extraction.schemas.controsoffitti import ControsoffittiProperties
from logic.extraction.schemas.rivestimenti import RivestimentiProperties
from logic.extraction.schemas.coibentazione import CoibentazioneProperties
from logic.extraction.schemas.impermeabilizzazione import ImpermeabilizzazioneProperties
from logic.extraction.schemas.opere_murarie import OpereMurarieProperties
from logic.extraction.schemas.facciate_cappotti import FacciateCappottiProperties
from logic.extraction.schemas.apparecchi_sanitari import ApparecchiSanitariProperties
from logic.extraction.postprocessor import postprocess_properties

logger = logging.getLogger(__name__)

router = APIRouter()

class ExtractionRequest(BaseModel):
    description: str
    family_force: Optional[str] = None
    wbs6_context: Optional[str] = None
    simulate: bool = False # If true, returns mock data without calling LLM (for testing)

class ExtractionResponse(BaseModel):
    family: str
    score: float
    properties: Dict[str, Any]
    used_schema: str

@router.post("/extract", response_model=ExtractionResponse)
async def extract_properties(req: ExtractionRequest):
    """
    Test endpoint for extraction logic.
    1. Routes to family
    2. Selects schema
    3. Calls LLM (or simulates)
    """
    
    # 1. Routing
    family_router = FamilyRouter()
    
    if req.family_force:
        family = req.family_force
        score = 1.0
    else:
        matches = family_router.route(req.description, top_k=1)
        if matches:
            best = matches[0]
            family = best.family_id
            score = best.score
        else:
            family = "core"
            score = 0.0
            
    # 2. Schema Selection
    schema_map = {
        "cartongesso": (CartongessoProperties, "CartongessoProperties"),
        "serramenti": (SerramentiProperties, "SerramentiProperties"),
        "pavimenti": (PavimentiProperties, "PavimentiProperties"),
        "controsoffitti": (ControsoffittiProperties, "ControsoffittiProperties"),
        "rivestimenti": (RivestimentiProperties, "RivestimentiProperties"),
        "coibentazione": (CoibentazioneProperties, "CoibentazioneProperties"),
        "impermeabilizzazione": (ImpermeabilizzazioneProperties, "ImpermeabilizzazioneProperties"),
        "opere_murarie": (OpereMurarieProperties, "OpereMurarieProperties"),
        "facciate_cappotti": (FacciateCappottiProperties, "FacciateCappottiProperties"),
        "apparecchi_sanitari": (ApparecchiSanitariProperties, "ApparecchiSanitariProperties"),
    }

    schema_cls, schema_name = schema_map.get(family, (CoreProperties, "CoreProperties"))
    schema_model = schema_cls()
    
    # Get schema dict with empty values
    schema_template = schema_model.get_valid_slots(min_confidence=0.0) 
    # Actually we want the full structure with None values to prompt the LLM
    # So let's re-instantiate clean model and dump it
    # Pydantic's .dict() usually excludes None by default if configured? 
    # Let's manually build a clean template
    # EvidenceSlot defaults are None/0.0
    schema_template = {}
    for field_name, field_info in schema_model.__fields__.items():
        # This is a bit rough, assuming all fields are EvidenceSlot
        schema_template[field_name] = {"value": None, "evidence": None, "confidence": 0.0}
        
    
    # 3. Extraction
    if req.simulate:
        # Return mock data
        extracted_data = schema_template.copy()
        extracted_data["note"] = "SIMULATED extraction"
    else:
        provider = os.getenv("EXTRACTION_LLM_PROVIDER", "mistral")
        model = os.getenv("EXTRACTION_LLM_MODEL", "mistral-large-latest")
        extractor = LLMExtractor(provider=provider, model=model)
        extracted_data = extractor.extract(
            description=req.description,
            schema=schema_template,
            family=family,
            wbs6=req.wbs6_context
        )
        extracted_data = postprocess_properties(extracted_data, min_confidence=0.0)
        
    return ExtractionResponse(
        family=family,
        score=score,
        properties=extracted_data,
        used_schema=schema_name
    )
