
import requests
import json

try:
    response = requests.get("http://localhost:8000/openapi.json")
    if response.status_code == 200:
        data = response.json()
        paths = data.get("paths", {})
        print("Found paths:")
        for p in paths.keys():
            if "extraction" in p:
                print(f"  {p}")
    else:
        print(f"Error fetching openapi: {response.status_code}")
except Exception as e:
    print(f"Failed: {e}")
