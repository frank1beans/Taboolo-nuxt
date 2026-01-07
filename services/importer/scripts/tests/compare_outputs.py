
import json
import re

def parse_mixed_output(filename):
    with open(filename, 'r') as f:
        content = f.read()
    
    # Extract JSON part (find first '{')
    start = content.find('{')
    if start == -1:
        return {}
    
    json_str = content[start:]
    try:
        return json.loads(json_str)
    except:
        return {}

def run():
    old = parse_mixed_output('services/importer/tests/golden_output.json')
    new = parse_mixed_output('services/importer/tests/new_output.json')
    
    # Mask timestamps
    def mask(obj):
        if isinstance(obj, dict):
            for k, v in obj.items():
                if k in ['created_at', 'updated_at', 'date', 'code']: # code has timestamp
                    obj[k] = "MASKED"
                else:
                    mask(v)
        elif isinstance(obj, list):
            for item in obj:
                mask(item)
                
    mask(old)
    mask(new)
    
    if old == new:
        print("SUCCESS: Outputs match!")
    else:
        print("FAILURE: Outputs differ!")
        # simple diff
        import difflib
        print('\n'.join(difflib.unified_diff(
            json.dumps(old, indent=2).splitlines(),
            json.dumps(new, indent=2).splitlines(),
            fromfile='old', tofile='new'
        )))

if __name__ == "__main__":
    run()
