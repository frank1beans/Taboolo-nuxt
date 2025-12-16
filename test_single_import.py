import requests
import os
import json

filename = "4440_08-11-2025.xml"
file_path = os.path.join(r"c:\Users\f.biggi\Taboolo-nuxt", filename)

# 1. Create Project
print("1. Creating project...")
import time
code = f"TEST-SINGLE-{int(time.time())}"
try:
    res = requests.post("http://localhost:3000/api/projects", json={"name": "Test Single Import", "code": code})
    if res.status_code != 200:
        print("Error creating project:", res.text)
        exit(1)
    j = res.json()
    project_id = j.get("id") or j.get("_id")
    print(f"Project Created: {project_id}")
except Exception as e:
    print("Exception:", e)
    exit(1)

# 2. Preview to get Preventivi
print("\n2. Getting Preview...")
try:
    with open(file_path, "rb") as f:
        files = {"file": (filename, f, "text/xml")}
        url = f"http://localhost:3000/api/projects/{project_id}/import-six/preview?mode=raw"
        res = requests.post(url, files=files)
        
    print("Preview Status:", res.status_code)
    if res.status_code != 200:
        print("Preview Failed:", res.text)
        try:
             rj = res.json()
             if 'data' in rj:
                 print("Preview Error Data:", rj['data'])
        except: pass
        exit(1)
        
    preview_data = res.json()
    preventivi = preview_data.get("preventivi", [])
    print(f"Found {len(preventivi)} preventivi.")
    
    if not preventivi:
        print("No preventivi found to select.")
        exit(1)
        
    # Select the first one
    selected_prev = preventivi[0]
    preventivo_id = selected_prev["preventivoId"]
    print(f"Selected Preventivo: {preventivo_id} - {selected_prev.get('description')}")
    
except Exception as e:
    print("Preview Exception:", e)
    exit(1)

# 3. Import Selected Preventivo
print(f"\n3. Importing Single Preventivo ({preventivo_id})...")
try:
    with open(file_path, "rb") as f:
        # Send estimate_id in data (multipart)
        files = {"file": (filename, f, "text/xml")}
        data = {"estimate_id": preventivo_id} 
        
        url = f"http://localhost:3000/api/projects/{project_id}/import-six?mode=raw"
        res = requests.post(url, files=files, data=data)
        
    print("Import Status:", res.status_code)
    
    try:
        j = res.json()
        print("Response JSON Keys:", list(j.keys()))
        if 'estimate' in j:
            est = j['estimate']
            est_id = est.get('_id') or est.get('id')
            print(f"Estimate Attributes: Name='{est.get('name')}', Items={len(est.get('items', []))}, ID='{est_id}'")
            if len(est.get('items', [])) == 0:
                print("WARNING: Imported 0 items!")
            else:
                print("SUCCESS: Items imported.")
    except:
        print("Response Text:", res.text)

except Exception as e:
    print("Import Exception:", e)
    exit(1)
