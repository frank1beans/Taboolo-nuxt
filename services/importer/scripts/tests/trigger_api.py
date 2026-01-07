
import requests
import sys

# FE4 (Correct ID)
url = "http://localhost:3000/api/projects/694933c9885765b245016fd4/estimates/69493534885765b245016fe4/price-list"

print(f"Requesting: {url}")
try:
    r = requests.get(url)
    print(f"Status: {r.status_code}")
    print(f"Content length: {len(r.content)}")
    if r.status_code == 200:
        data = r.json()
        items = data.get('items', [])
        print(f"Items count: {len(items)}")
        if items:
            print("Sample Item:", items[0])
            print("Total Quantity:", items[0].get('total_quantity'))
            print("Total Amount:", items[0].get('total_amount'))
except Exception as e:
    print(f"Error: {e}")
