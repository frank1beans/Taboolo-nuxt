
from typing import List, Tuple, Optional
from datetime import datetime
import uuid

# Logic imports
# We assume these exist or will be imported correctly in the final file context
from schemas.domain import NormalizedEstimate, PriceListItem as DomainPriceItem
from schemas.models import (
    Project, WbsNode, PriceList, PriceListItem, 
    Estimate, EstimateItem, MeasurementDetail
)

class LoaderService:
    @staticmethod
    def transform(estimate: NormalizedEstimate, project_id: Optional[str] = None, preventivo_id: Optional[str] = None) -> Tuple[Project, List[WbsNode], PriceList, Estimate]:
        
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
            
        # 3. PriceList
        pl_items = []
        # Map for fast group lookup
        group_map = {g.id: g for g in groups}

        for prod in estimate.price_list_items:
            # Map Unit ID to string label if available
            # logic: estimate.units is Dict[id, label]
            unit_label = estimate.units.get(prod.unit, prod.unit)
            
            # extract first price
            price_val = 0.0
            if prod.price_by_list:
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
                extraDescription=prod.long_description,
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
        if preventivo_id:
             target_preventivi = [p for p in estimate.preventivi if p.id == preventivo_id]
             # Update estimate name to match selected
             if target_preventivi:
                 est_name = target_preventivi[0].name or est_name
        
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
                    from decimal import Decimal, ROUND_HALF_UP
                    
                    # Helper for rounding
                    def _legacy_round(val: float) -> float:
                        if val is None: return 0.0
                        return float(Decimal(f"{val:.10f}").quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
                    
                    final_qty = meas.total_quantity
                    
                    unit_price = 0.0
                    
                    # 1. Find the base product item
                    matching_item = None
                    if meas.product_id:
                        matching_item = next((item for item in pl_items if item.id == meas.product_id), None)
                    
                    if matching_item:
                        # Default to the basic price we extracted earlier
                        unit_price = matching_item.price
                        
                        # 2. If we have a specific price list ID, try to get that specific price
                        if meas.price_list_id:
                             prod = domain_item_map.get(meas.product_id)
                             if prod and meas.price_list_id in prod.price_by_list:
                                 unit_price = prod.price_by_list[meas.price_list_id]
                    
                    # CRITICAL FIX: Round quantity BEFORE multiplying by price
                    # Legacy system rounds quantity to 2 decimals first.
                    # Example: 74.185 -> 74.19
                    final_qty = _legacy_round(final_qty)
                    
                    calc_amount = _legacy_round(final_qty * unit_price)
                except Exception as e:
                    print(f"[Loader Error] Failed to calc legacy amount for {meas.id}: {e}", flush=True)
                    calc_amount = 0.0
                    final_qty = meas.total_quantity # Fallback

                est_items.append(EstimateItem(
                    _id=meas.id,
                    progressive=float(meas.progressive) if meas.progressive else None,
                    priceListItemId=meas.product_id,
                    relatedItemId=meas.related_item_id,
                    groupIds=meas.wbs_node_ids,
                    quantity=final_qty,
                    amount=calc_amount,
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
        
        return project, groups, price_list, estimate_doc
