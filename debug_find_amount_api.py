import requests
import sys

def find_missing_amount():
    project_id = "694078e1520ff4298400cf2e"
    # Need to find the correct endpoint for fetching items.
    # Looking at `test_single_import.py`, I can guess.
    # Or just use `debug_totals.py` logic which calls stats.
    # But stats is aggregated.
    # I need raw items.
    
    # Correct URL from debug_totals.py
    url = f"http://localhost:3000/api/projects/{project_id}/estimate/694078e2520ff4298400d64e/items"
    
    print(f"Fetching: {url}")
    try:
        r = requests.get(url)
        r.raise_for_status()
        items = r.json() 
        
        target = 304.10 # Half of 608.20
        tolerance = 1.0 # Tolerance
        
        found = False
        for item in items:
            amt = item.get('project', {}).get('amount')
            if amt is None: continue
            
            diff = abs(abs(amt) - target)
            if diff <= tolerance:
                print(f"MATCH 304.10: Prog: {item.get('code')} | Desc: {item.get('description')} | Amount: {amt}")
                found = True
        
        if not found:
            print("No matches for 304.10 found via API.")
        
    except Exception as e:
        print(f"Error fetching API: {e}")

if __name__ == "__main__":
    find_missing_amount()
