import sys
import os
import json

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from schemas.models import Group

def test_serialization():
    g = Group(
        _id="12345",
        projectId="PROJ-001",
        code="A.01",
        description="Test Group",
        level=1
    )
    
    print("--- Model Dump ---")
    print(g.model_dump())
    
    print("\n--- Model Dump (by_alias=True) ---")
    print(g.model_dump(by_alias=True))
    
    print("\n--- JSON (by_alias=True) ---")
    print(g.model_dump_json(by_alias=True))

    # Check if we can instantiate with 'id' instead of '_id'
    g2 = Group(
        id="67890",
        projectId="PROJ-001",
        code="A.02",
        description="Test Group 2",
        level=2
    )
    print("\n--- Model 2 Dump (by_alias=True) ---")
    print(g2.model_dump(by_alias=True))

if __name__ == "__main__":
    test_serialization()
