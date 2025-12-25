
import requests
import json

def test_api():
    url = "http://localhost:3000/api/analytics/global-map"
    # Project ID from previous logs: 694867af865e3b0469153450
    payload = {
        "project_ids": ["694867af865e3b0469153450"] 
    }
    
    try:
        print(f"POST {url}")
        print(f"Payload: {payload}")
        res = requests.post(url, json=payload)
        
        if res.status_code == 200:
            data = res.json()
            poles = data.get("poles", [])
            points = data.get("points", [])
            print(f"Status: 200 OK")
            print(f"Points count: {len(points)}")
            print(f"Poles count: {len(poles)}")
            if len(poles) > 0:
                print("First pole:", poles[0])
            else:
                print("No poles returned.")
        else:
            print(f"Error: {res.status_code}")
            print(res.text)
            
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_api()
