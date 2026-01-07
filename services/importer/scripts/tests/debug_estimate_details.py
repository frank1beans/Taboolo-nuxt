
import requests
import sys
import json

# Project ID: 694933c9885765b245016fd4
# Estimate ID: 69493534885765b245016fe4
project_id = "694933c9885765b245016fd4"
estimate_id = "69493534885765b245016fe4"
url = f"http://localhost:3000/api/projects/{project_id}/estimate/{estimate_id}"

print(f"Requesting: {url}")
try:
    r = requests.get(url)
    print(f"Status: {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        print("Response Data:")
        print(json.dumps(data, indent=2))
        
        # Check critical fields
        if not data:
            print("ERROR: Empty response")
        elif 'id' not in data:
            print("ERROR: Missing 'id' field")
        else:
            print("SUCCESS: Valid response")
    else:
        print(f"Error Response: {r.text}")
except Exception as e:
    print(f"Error: {e}")
