import requests
import json
import sys

# Usage: python debug_totals.py <project_id>

if len(sys.argv) < 2:
    print("Usage: python debug_totals.py <project_id>")
    sys.exit(1)

project_id = sys.argv[1]

# 1. Get Context to find estimate ID
ctx_url = f"http://localhost:3000/api/projects/{project_id}/context"
res = requests.get(ctx_url)
if res.status_code != 200:
    print("Error fetching context:", res.status_code)
    sys.exit(1)
ctx = res.json()
ests = ctx.get("estimates", [])
if not ests:
    print("No estimates found.")
    sys.exit(1)
estimate_id = ests[0].get("id") or ests[0].get("_id")
print(f"Estimate ID: {estimate_id}")

# 2. Get Attributes (Stats)
stats_url = f"http://localhost:3000/api/projects/{project_id}/analytics/stats"
res = requests.get(stats_url)
print("Stats API Total:", res.json().get("project_total"))

# 3. Get Items
url = f"http://localhost:3000/api/projects/{project_id}/estimate/{estimate_id}/items"
res = requests.get(url)
items = res.json()

vedi_voce_count = 0
vedi_voce_missing_price_count = 0
vedi_voce_potential_amount = 0.0
calculated_total = 0.0

for item in items:
    related = item.get("related_item_id") or item.get("relatedItemId")
    if related:
        vedi_voce_count += 1
        pli = item.get("price_list_item_id") or item.get("priceListItemId")
        
        # Check if price is resolved (from lookup)
        # The API output has 'project': { 'unit_price': ..., 'amount': ... }
        # If amount is 0 but quantity > 0, it's suspicious
        qty = item.get("project", {}).get("quantity", 0)
        uprice = item.get("project", {}).get("unit_price", 0)
        amt = item.get("project", {}).get("amount", 0)
        
        if amt == 0 and qty != 0:
             print(f"UNPRICED Item {item.get('id')}: Qty={qty}, Price={uprice}, PLI={pli}, Related={related}")
             vedi_voce_potential_amount += (qty * 1) # Unknown price
             vedi_voce_missing_price_count += 1 # Increment count for items with Qty>0 but Amount=0
        
        if qty == 0:
             print(f"ZERO QTY Item {item.get('id')}: Qty={qty}, Price={uprice}, PLI={pli}, Related={related}")

        calc_amount = item.get('project', {}).get('amount')
        if calc_amount is None:
            calc_amount = qty * uprice
        
        calculated_total += float(calc_amount)

print(f"Total Items: {len(items)}")
print(f"Vedi Voce Identified: {vedi_voce_count}")
print(f"Items with Qty>0 but Amount=0: {vedi_voce_missing_price_count}")
print(f"DEBUG Calculated Total: {calculated_total:,.2f}")
