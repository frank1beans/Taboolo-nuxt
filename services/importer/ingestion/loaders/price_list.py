
from typing import List, Optional
from infrastructure.dto import PriceList, PriceListItem, WbsNode
from domain import NormalizedEstimate

class PriceListLoader:
    @staticmethod
    def create(
        estimate: NormalizedEstimate, 
        project_id: str, 
        groups: List[WbsNode], 
        preventivo_id: Optional[str] = None
    ) -> PriceList:
        
        pl_items = []
        # Map for fast group lookup
        group_map = {g.id: g for g in groups}

        # Determine target price list ID from the selected preventivo's measurements
        target_price_list_id = PriceListLoader._determine_target_price_list(estimate, preventivo_id)
        
        for prod in estimate.price_list_items:
            # Map Unit ID to string label if available
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
            
        return PriceList(
            projectId=project_id,
            name="Listino Importato",
            items=pl_items
        )

    @staticmethod
    def _determine_target_price_list(estimate: NormalizedEstimate, preventivo_id: Optional[str]) -> Optional[str]:
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
            
        return target_price_list_id
