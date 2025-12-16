import requests
import json
import sys

# Usage: python test_items_get.py <project_id> [estimate_id]

if len(sys.argv) < 2:
    print("Usage: python test_items_get.py <project_id> [estimate_id]")
    sys.exit(1)

project_id = sys.argv[1]
estimate_id = None
if len(sys.argv) > 2:
    estimate_id = sys.argv[2]

if not estimate_id:
    print("Fetching Project Context to find Estimate ID...")
    ctx_url = f"http://localhost:3000/api/projects/{project_id}/context"
    res = requests.get(ctx_url)
    if res.status_code != 200:
        print("Error fetching context:", res.status_code)
        sys.exit(1)
    ctx = res.json()
    ests = ctx.get("estimates", [])
    if not ests:
        print("No estimates found in context.")
        sys.exit(1)
    estimate_id = ests[0].get("id") or ests[0].get("_id")
    print(f"Found Estimate ID: {estimate_id}")

print(f"Fetching items for Project {project_id}, Estimate {estimate_id}...")

url = f"http://localhost:3000/api/projects/{project_id}/estimate/{estimate_id}/items"

try:
    res = requests.get(url)
    if res.status_code != 200:
        print("Error:", res.status_code, res.text)
        sys.exit(1)
        
    items = res.json()
    print(f"Retrieved {len(items)} items.")
    
    if len(items) > 0:
        found_ref = False
        for item in items:
            if item.get("related_item_id") or item.get("relatedItemId"):
                print("SUCCESS: Found item with related_item_id:", item.get("related_item_id"))
                found_ref = True
                break
        
        if not found_ref:
            print("INFO: No items with related_item_id found in this sample (expected if file has none).")
            
        first = items[0]
        # print("First Item Sample:", json.dumps(first, indent=2))
            
except Exception as e:
    print("Exception:", e)
