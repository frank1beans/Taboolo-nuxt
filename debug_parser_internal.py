import sys
import os
from pathlib import Path

# Add services/importer to path so we can import parsers
sys.path.append(os.path.join(os.getcwd(), "services", "importer"))

from parsers.six.parser import SixParser
from loader import LoaderService

def debug_vedi_voce():
    file_path = "4440_08-11-2025.xml"
    with open(file_path, "rb") as f:
        content = f.read()

    print("Parsing file...")
    try:
        parser = SixParser(content)
        # We need to trigger the full parse to get measurements
        # The 'parse' method requires a preventivo_id. Let's list them first.
        prevs = parser.list_preventivi()
        target_id = None
        for p in prevs:
             if "987" in p.internal_id or "987" in p.preview_url: # basic check
                  target_id = p.internal_id
                  break
        
        if not target_id:
            target_id = prevs[-1].internal_id # Validation file usually has the one we want

        print(f"Parsing Preventivo: {target_id}")
        parsed = parser.parse(target_id)
        
        print(f"Total Measurements: {len(parsed.measurements)}")
    except Exception as e:
        import traceback
        traceback.print_exc()
        sys.exit(1)

    # Find items with references
    # Since we can't easily access the internal 'ref_map' from here without modifying the class,
    # we will inspect the OUTPUT measurements.
    
    # We are looking for items that SHOULD have a quantity but might have 0.
    # Or items that we know have references (from previous logs: Ref to 2280).
    
    # Search for items with NON-ZERO quantity
    qty_gt_0 = 0
    price_zero = 0
    ok_items = 0
    
    debug_targets = ["2280", "5460", "7340"] # Some refs seen in logs
    
    print("\n--- Inspecting Verified Items ---")
    for m in parsed.measurements:
        # Check if description mentions "vedi voce"
        desc = m.description.lower() if m.description else ""
        has_ref_text = "vedi voce" in desc
        
        # We can also check m.details to see if we spot our logic results?
        # Actually m.total_quantity is what matters.
        
        if has_ref_text:
             print(f"\nItem: {m.definition_id} | Prog: {m.progressive}")
             print(f"Desc: {m.description[:50]}...")
             print(f"Qty: {m.total_quantity} | Price: {m.price}")
             
             if m.price == 0:
                 print("!!! WARNING: PRICE IS ZERO !!!")

        if m.total_quantity > 0:
            qty_gt_0 += 1
            if m.price == 0:
                price_zero += 1
            else:
                ok_items += 1

    print(f"\n--- Summary ---")
    print(f"Items with Qty > 0: {qty_gt_0}")
    print(f"  - Price == 0: {price_zero}")
    print(f"  - Price > 0:  {ok_items}")

if __name__ == "__main__":
    debug_vedi_voce()
