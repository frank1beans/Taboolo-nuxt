
from typing import List, Optional
from decimal import Decimal, ROUND_HALF_UP

from infrastructure.dto import Estimate, EstimateItem, MeasurementDetail, PriceList
from domain import NormalizedEstimate
from domain.services.amount_calculator import AmountCalculator


class EstimateLoader:
    @staticmethod
    def create(
        estimate: NormalizedEstimate, 
        project_id: str, 
        price_list: PriceList, 
        preventivo_id: Optional[str] = None
    ) -> Estimate:
        
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
                    unit_price = 0.0
                    used_price_list = "default"
                    
                    # 1. Find the base product item
                    matching_item = next((item for item in price_list.items if item.id == meas.product_id), None)
                    
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
                    unit_price = 0.0

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
                
        return Estimate(
            projectId=project_id,
            priceListId=price_list.id, # Link them
            name=est_name,
            items=est_items
        )

    @staticmethod
    def _legacy_round(val: float) -> float:
        if val is None: return 0.0
        # Convert to string first to avoid float precision issues
        return float(Decimal(f"{val:.10f}").quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
