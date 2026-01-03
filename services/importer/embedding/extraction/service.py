
import os
from typing import Optional

from infrastructure.dto import PriceList, Estimate
from embedding.extraction.router import FamilyRouter
from embedding.extraction.llm_extractor import LLMExtractor
from embedding.extraction.schemas.core import CoreProperties
from embedding.extraction.schemas.cartongesso import CartongessoProperties
from embedding.extraction.schemas.serramenti import SerramentiProperties
from embedding.extraction.schemas.pavimenti import PavimentiProperties
from embedding.extraction.schemas.controsoffitti import ControsoffittiProperties
from embedding.extraction.schemas.rivestimenti import RivestimentiProperties
from embedding.extraction.schemas.coibentazione import CoibentazioneProperties
from embedding.extraction.schemas.impermeabilizzazione import ImpermeabilizzazioneProperties
from embedding.extraction.schemas.opere_murarie import OpereMurarieProperties
from embedding.extraction.schemas.facciate_cappotti import FacciateCappottiProperties
from embedding.extraction.schemas.apparecchi_sanitari import ApparecchiSanitariProperties
from embedding.extraction.postprocessor import postprocess_properties

class PropertyExtractionService:
    @staticmethod
    def enrich_price_list(price_list: PriceList, estimate_doc: Estimate):
        try:
            router = FamilyRouter()
            provider = os.getenv("EXTRACTION_LLM_PROVIDER", "mistral")
            model = os.getenv("EXTRACTION_LLM_MODEL", "mistral-large-latest")
            extractor = LLMExtractor(provider=provider, model=model)

            if extractor.provider != "ollama" and not extractor.api_key:
                print("[Loader] WARN: No LLM API key found. Skipping extraction.", flush=True)
                return

            used_pli_ids = set()
            for est_item in estimate_doc.items:
                if est_item.price_list_item_id:
                    used_pli_ids.add(est_item.price_list_item_id)

            for item in price_list.items:
                if used_pli_ids and item.id not in used_pli_ids:
                    continue

                text = item.extended_description or item.long_description or item.description
                if not text:
                    continue

                wbs6_text = item.wbs6 or ""
                matches = router.route_wbs6(wbs6_text, top_k=1)
                if not matches:
                    continue

                family = matches[0].family_id

                if family == "cartongesso":
                    schema_model = CartongessoProperties()
                elif family == "serramenti":
                    schema_model = SerramentiProperties()
                elif family == "pavimenti":
                    schema_model = PavimentiProperties()
                elif family == "controsoffitti":
                    schema_model = ControsoffittiProperties()
                elif family == "rivestimenti":
                    schema_model = RivestimentiProperties()
                elif family == "coibentazione":
                    schema_model = CoibentazioneProperties()
                elif family == "impermeabilizzazione":
                    schema_model = ImpermeabilizzazioneProperties()
                elif family == "opere_murarie":
                    schema_model = OpereMurarieProperties()
                elif family == "facciate_cappotti":
                    schema_model = FacciateCappottiProperties()
                elif family == "apparecchi_sanitari":
                    schema_model = ApparecchiSanitariProperties()
                else:
                    continue

                schema_template = {
                    field_name: {"value": None, "evidence": None, "confidence": 0.0}
                    for field_name in schema_model.__fields__
                }

                extracted = extractor.extract(
                    description=text,
                    schema=schema_template,
                    family=family,
                    wbs6=item.wbs6,
                )
                item.extracted_properties = postprocess_properties(extracted, min_confidence=0.0)
        except Exception as e:
            print(f"[Loader] WARNING: Failed to extract properties: {e}", flush=True)

