
from typing import List, Tuple, Optional
from datetime import datetime
import os
import uuid

# Domain entities and services
from domain import NormalizedEstimate, PriceListItem as DomainPriceItem
from domain.services.amount_calculator import AmountCalculator

# DTOs for API output
from infrastructure.dto import (
    Project, WbsNode, PriceList, PriceListItem, 
    Estimate, EstimateItem, MeasurementDetail
)

class LoaderService:
    @staticmethod
    def transform(
        estimate: NormalizedEstimate,
        project_id: Optional[str] = None,
        preventivo_id: Optional[str] = None,
        extract_properties: bool = False,
    ) -> Tuple[Project, List[WbsNode], PriceList, Estimate]:
        
        # 1. Project
        proj_id = project_id or str(uuid.uuid4())
        
        # Determine Project Name
        p_name = estimate.project_name or "Imported Project"
        
        project = Project(
            _id=proj_id,
            code="IMP-" + datetime.utcnow().strftime("%Y%m%d-%H%M"), # Fallback code
            name=p_name,
            status="active"
        )
        
        # 2. Groups (WBS)
        groups = []
        for node in estimate.wbs_nodes:
            # Skip if no code (unless root?)
            if not node.code: continue
            
            groups.append(WbsNode(
                id=node.id, # Keep XML ID for linking (Explicit 'id' field)
                projectId=proj_id,
                code=node.code,
                description=node.name or node.code,
                level=node.level,
                type=node.type, # Map parsed type to type
                parentId=node.parent_id,
                path=None # Can be computed if needed
            ))
        
        # 2b. Normalize WBS6 descriptions and compute embeddings
        import re
        
        def clean_wbs_desc_for_import(desc: str, code: str) -> str:
            """Normalize WBS description by removing code prefix."""
            if not desc:
                return ""
            cleaned = desc.strip()
            if code:
                if cleaned.startswith(code):
                    cleaned = cleaned[len(code):].strip()
            while cleaned and cleaned[0] in "-–:. ":
                cleaned = cleaned[1:].strip()
            cleaned = re.sub(r'\s+', ' ', cleaned)
            cleaned = cleaned.strip().title()
            return cleaned if cleaned else desc
        
        # Collect WBS6 nodes and their normalized descriptions
        wbs6_groups = [g for g in groups if g.level == 6]
        
        if wbs6_groups:
            print(f"[Loader] Processing {len(wbs6_groups)} WBS6 nodes for normalization...", flush=True)
            
            # Normalize descriptions
            for g in wbs6_groups:
                g.normalized_description = clean_wbs_desc_for_import(g.description, g.code)
            
            # Compute embeddings for unique normalized descriptions
            unique_descs = list(set(g.normalized_description for g in wbs6_groups if g.normalized_description))
            
            if unique_descs:
                print(f"[Loader] Computing embeddings for {len(unique_descs)} unique WBS6 categories...", flush=True)
                try:
                    from logic.embedding import get_embedder
                    embedder = get_embedder()
                    embeddings = embedder.compute_embeddings(unique_descs)
                    
                    # Map description -> embedding
                    embedding_map = {}
                    for i, desc in enumerate(unique_descs):
                        if embeddings[i] is not None:
                            embedding_map[desc] = embeddings[i]
                    
                    # Assign embeddings to nodes
                    for g in wbs6_groups:
                        if g.normalized_description in embedding_map:
                            g.embedding = embedding_map[g.normalized_description]
                    
                    print(f"[Loader] Successfully computed {len(embedding_map)} WBS6 embeddings", flush=True)
                except Exception as e:
                    print(f"[Loader] WARNING: Failed to compute WBS6 embeddings: {e}", flush=True)
            
        # 3. PriceList
        pl_items = []
        # Map for fast group lookup
        group_map = {g.id: g for g in groups}

        # Determine target price list ID from the selected preventivo's measurements
        # This ensures PriceListItem.price uses the correct listaQuotazioneId
        target_price_list_id = None
        target_preventivi = estimate.preventivi
        if preventivo_id:
            target_preventivi = [p for p in estimate.preventivi if p.id == preventivo_id]
        
        # Extract the listaQuotazioneId from the first measurement that has one
        for prev in target_preventivi:
            for meas in prev.measurements:
                if meas.price_list_id:
                    target_price_list_id = meas.price_list_id
                    break
            if target_price_list_id:
                break
        
        if target_price_list_id:
            print(f"[Loader] Using target price list ID: {target_price_list_id}", flush=True)
        else:
            print("[Loader] WARN: No price_list_id found in measurements, using first price", flush=True)

        for prod in estimate.price_list_items:
            # Map Unit ID to string label if available
            # logic: estimate.units is Dict[id, label]
            unit_label = estimate.units.get(prod.unit, prod.unit)
            
            # Select price from target price list, fallback to first
            price_val = 0.0
            if prod.price_by_list:
                if target_price_list_id and target_price_list_id in prod.price_by_list:
                    price_val = prod.price_by_list[target_price_list_id]
                else:
                    # Fallback to first price if target not found
                    price_val = list(prod.price_by_list.values())[0]
            
            # Resolve denormalized WBS fields
            _wbs6 = None
            _wbs7 = None
            
            for wid in prod.wbs_ids:
                if wid in group_map:
                    grp = group_map[wid]
                    if grp.level == 6:
                        _wbs6 = grp.description or grp.code
                    elif grp.level == 7:
                        _wbs7 = grp.description or grp.code

            pl_items.append(PriceListItem(
                _id=prod.id, # Use XML ID
                code=prod.code,
                description=prod.description,
                long_description=prod.long_description,
                extended_description=prod.extended_description,
                unit=unit_label,
                price=price_val,
                groupIds=prod.wbs_ids,
                wbs6=_wbs6,
                wbs7=_wbs7
            ))
            
        price_list = PriceList(
            projectId=proj_id,
            name="Listino Importato",
            items=pl_items
        )
        
        # Create Price Map for fast lookup
        price_map = {item.id: item.price for item in pl_items}

        # 4. Estimate
        # Flatten preventivi into one Estimate for now (or multiple)
        # Using the first defined preventivo name as the estimate name
        est_name = "Computo Generale"
        if estimate.preventivi:
            est_name = estimate.preventivi[0].name or est_name
            
        est_items = []
        
        # Filter preventivi if ID is provided
        target_preventivi = estimate.preventivi
        print(f"[Loader] Total preventivi in file: {len(estimate.preventivi)}", flush=True)
        print(f"[Loader] preventivo_id filter: {preventivo_id}", flush=True)
        
        if preventivo_id:
             target_preventivi = [p for p in estimate.preventivi if p.id == preventivo_id]
             # Update estimate name to match selected
             if target_preventivi:
                 est_name = target_preventivi[0].name or est_name
                 print(f"[Loader] Filtered to {len(target_preventivi)} preventivo: '{est_name}'", flush=True)
             else:
                 print(f"[Loader] WARNING: No preventivo found with id={preventivo_id}!", flush=True)
                 # List available IDs for debugging
                 available_ids = [p.id for p in estimate.preventivi[:5]]
                 print(f"[Loader] Available IDs (first 5): {available_ids}", flush=True)
        else:
             print(f"[Loader] No preventivo_id provided, loading ALL {len(target_preventivi)} preventivi!", flush=True)
        
        # Count total measurements
        total_meas = sum(len(p.measurements) for p in target_preventivi)
        print(f"[Loader] Total measurements to process: {total_meas}", flush=True)
        
        # Helper for rounding
        from decimal import Decimal, ROUND_HALF_UP
        def _legacy_round(val: float) -> float:
            if val is None: return 0.0
            # Convert to string first to avoid float precision issues
            return float(Decimal(f"{val:.10f}").quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))

        # Optimized Lookup Map for Domain Items (needed for price resolution)
        domain_item_map = {item.id: item for item in estimate.price_list_items}

        for prev in target_preventivi:
            for meas in prev.measurements:
                # One Measurement in Domain = One Item in DB
                
                # Conversion of details
                details = []
                for d in meas.details:
                    details.append(MeasurementDetail(
                        formula=d.formula, 
                        value=float(d.quantity)
                    ))
                
                # Parse progressive to float for payload if possible
                prog_val = 0
                if meas.progressive:
                    try:
                         prog_val = float(meas.progressive)
                    except: pass

                # Calculate explicit amount with legacy rounding logic
                try:
                    from domain.services.amount_calculator import AmountCalculator
                    
                    unit_price = 0.0
                    
                    # 1. Find the base product item
                    matching_item = None
                    if meas.product_id:
                        matching_item = next((item for item in pl_items if item.id == meas.product_id), None)
                    
                    if matching_item:
                        # Default to the basic price we extracted earlier
                        unit_price = matching_item.price
                        used_price_list = "default"
                        
                        # 2. If we have a specific price list ID, try to get that specific price
                        if meas.price_list_id:
                             prod = domain_item_map.get(meas.product_id)
                             if prod and meas.price_list_id in prod.price_by_list:
                                 unit_price = prod.price_by_list[meas.price_list_id]
                                 used_price_list = meas.price_list_id
                             else:
                                 # Debug: why is the price_list_id not found?
                                 if prod:
                                     print(f"[Loader] WARN: price_list_id={meas.price_list_id} not in price_by_list for product {meas.product_id}. Available keys: {list(prod.price_by_list.keys())}", flush=True)
                                 else:
                                     print(f"[Loader] WARN: product {meas.product_id} not found in domain_item_map. Meas.price_list_id={meas.price_list_id}", flush=True)
                        
                        # SPECIFIC DEBUG for L001.020.01 issue
                        if meas.product_id == "11181" or (matching_item and matching_item.code == "L001.020.01"):
                            prod = domain_item_map.get(meas.product_id)
                            print(f"[DEBUG L001.020.01] product={meas.product_id}, price_list_id={meas.price_list_id}, price_by_list={prod.price_by_list if prod else 'N/A'}, USED={used_price_list}, PRICE={unit_price}", flush=True)
                        
                        # Debug log for first 10 items with price_list_id
                        if meas.price_list_id and len(est_items) < 10:
                            print(f"[Loader Debug] Item {meas.id}: product={meas.product_id}, price_list_id={meas.price_list_id}, used={used_price_list}, price={unit_price}", flush=True)
                    
                    # Use AmountCalculator for consistent rounding
                    final_qty, calc_amount = AmountCalculator.calculate(
                        meas.total_quantity, 
                        unit_price,
                        round_quantity_first=True
                    )
                except Exception as e:
                    print(f"[Loader Error] Failed to calc legacy amount for {meas.id}: {e}", flush=True)
                    calc_amount = 0.0
                    final_qty = meas.total_quantity # Fallback

                est_items.append(EstimateItem(
                    _id=meas.id,
                    code=matching_item.code if matching_item else None,
                    progressive=float(meas.progressive) if meas.progressive else None,
                    priceListItemId=meas.product_id,
                    relatedItemId=meas.related_item_id,
                    groupIds=meas.wbs_node_ids,
                    quantity=final_qty,
                    amount=calc_amount,
                    unitPrice=unit_price,  # Pass correct price from measurement's price list
                    measurements=[
                        MeasurementDetail(formula=d.formula, value=d.quantity) 
                        for d in meas.details
                    ]
                ))
                
        estimate_doc = Estimate(
            projectId=proj_id,
            priceListId=price_list.id, # Link them
            name=est_name,
            items=est_items
        )

        # 5. Extract technical properties (optional)
        if extract_properties and price_list.items:
            try:
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

                router = FamilyRouter()
                provider = os.getenv("EXTRACTION_LLM_PROVIDER", "mistral")
                model = os.getenv("EXTRACTION_LLM_MODEL", "mistral-large-latest")
                extractor = LLMExtractor(provider=provider, model=model)

                if extractor.provider != "ollama" and not extractor.api_key:
                    print("[Loader] WARN: No LLM API key found. Skipping extraction.", flush=True)
                else:
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

        return project, groups, price_list, estimate_doc
