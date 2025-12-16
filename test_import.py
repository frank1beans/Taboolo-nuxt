import requests
import os

filename = "4440_08-11-2025.xml"
file_path = os.path.join(r"c:\Users\f.biggi\Taboolo-nuxt", filename)

# 1. Create Project
print("Creating project...")
import time
code = f"TEST-{int(time.time())}"
try:
    res = requests.post("http://localhost:3000/api/projects", json={"name": "Test Import Automation", "code": code})
    if res.status_code != 200:
        print("Error creating project status:", res.status_code)
        print("Error Body:", res.text) 
        exit(1)
except Exception as e:
    print("Exception:", e)
    exit(1)
    
print("Response JSON:", res.json())
project_id = res.json().get("id") or res.json().get("_id")
print(f"Project Created: {project_id}")

# 2. Upload File
print("Uploading file...")
with open(file_path, "rb") as f:
    files = {"file": (filename, f, "text/xml")}
    url = f"http://localhost:3000/api/projects/{project_id}/import-six?mode=raw"
    res = requests.post(url, files=files)
    
print("Status:", res.status_code)
try:
    j = res.json()
    print("Response JSON:", j)
    if 'data' in j:
        print("Data Detail:", j['data'])
except:
    print("Response Text:", res.text)

with open("error.log", "w", encoding="utf-8") as f:
    f.write(res.text)
