import sys
import os
from pathlib import Path

# Add services/importer to python path
sys.path.append(os.getcwd())

from parsers.six.parser import SixParser

def test_parser():
    file_path = r"c:\Users\f.biggi\Taboolo-nuxt\4440_08-11-2025.xml"
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    print(f"Reading file: {file_path}")
    with open(file_path, "rb") as f:
        content = f.read()
    
    print(f"File size: {len(content)} bytes")
    
    parser = SixParser()
    try:
        estimate = parser.parse(content, filename="test.xml")
        print(f"Parsing complete.")
        print(f"Preventivi found: {len(estimate.preventivi)}")
        for p in estimate.preventivi:
            print(f" - {p.id}: {p.name} ({len(p.measurements)} measurements)")
            
    except Exception as e:
        print(f"Parsing failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_parser()
