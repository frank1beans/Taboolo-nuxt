
import requests
import json

url = "http://localhost:8000/api/v1/extraction/extract"
payload = {
    "description": "Parete in cartongesso 12.5 mm",
    "simulate": True
}
headers = {
    "Content-Type": "application/json"
}

try:
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print("Response JSON:")
        print(json.dumps(response.json(), indent=2))
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Failed to connect: {e}")
