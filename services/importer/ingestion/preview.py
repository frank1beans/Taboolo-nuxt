
from typing import Dict, List, Any
from domain import NormalizedEstimate

class PreviewService:
    @staticmethod
    def generate_summary(normalized: NormalizedEstimate) -> Dict[str, Any]:
        """
        Generates a lightweight summary of the estimate for frontend preview.
        """
        # Build lookup for price list items (product_id -> PriceListItem)
        pli_map = {pli.id: pli for pli in normalized.price_list_items}
        
        # Build lookup for price lists (id -> label)
        price_list_labels = {}
        for pl in normalized.price_lists:
            price_list_labels[pl.id] = pl.label or pl.code or pl.id
        
        # Map to lightweight preview structure expected by frontend
        preventivi = []
        for p in normalized.preventivi:
            # Calculate total amount and collect unique products
            total_amount = 0.0
            unique_product_ids = set()
            used_price_list_ids = set()
            
            for m in p.measurements:
                unique_product_ids.add(m.product_id)
                if m.price_list_id:
                    used_price_list_ids.add(m.price_list_id)
                
                # Get price from price list item (logic replicated from old endpoint)
                pli = pli_map.get(m.product_id)
                if pli:
                    # Logic note: strictly this duplicates price lookup logic from Loader/PriceListItem
                    # avoiding full dependency on Loader for speed/simplicity of preview
                    unit_price = pli.get_price(m.price_list_id)
                    total_amount += m.total_quantity * unit_price
            
            # Determine primary price list label
            price_list_label = None
            if used_price_list_ids:
                primary_pl_id = next(iter(used_price_list_ids))
                price_list_label = price_list_labels.get(primary_pl_id, primary_pl_id)
            
            preventivi.append({
                "preventivoId": p.id,
                "code": p.code,
                "description": p.name or p.code,
                "stats": {
                    "items": len(p.measurements),
                    "total_amount": round(total_amount, 2),
                    "unique_products": len(unique_product_ids),
                },
                "price_list_label": price_list_label,
                "date": p.metadata.get("date") if p.metadata else None,
                "author": p.metadata.get("author") if p.metadata else None,
            })
            
        return {
            "estimates": preventivi,
            "preventivi": preventivi,
            "groups_count": len(normalized.wbs_nodes),
            "products_count": len(normalized.price_list_items)
        }
