
import sys
import os

# Add local directory to path to allow imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from embedding.extraction.router import FamilyRouter
from embedding.extraction.schemas.cartongesso import CartongessoProperties

def test_router():
    print("\n=== Testing FamilyRouter ===")
    router = FamilyRouter()
    
    test_cases = [
        ("Fornitura e posa di parete in cartongesso con lastra idrofuga...", "cartongesso"),
        ("Porta interna a battente in legno tamburato...", "serramenti"),
        ("Pavimento in gres porcellanato 60x60...", "pavimenti"),
        ("Muro in mattoni pieni da 12cm...", "core"), # Fallback
        ("Controsoffitto in lastre di gesso rivestito...", "cartongesso"),
        ("Serramento in alluminio a taglio termico...", "serramenti"),
        ("Parete in cartongesso 12.5 mm", "cartongesso"),
    ]
    
    for text, expected in test_cases:
        print(f"\nText: {text[:50]}...")
        matches = router.route(text)
        if matches:
            best = matches[0]
            print(f"  -> Match: {best.family_id} (score={best.score})")
            if best.family_id == expected:
                 print("  ✅ OK")
            else:
                 if expected == "core" and best.score < 0.3:
                      print("  ✅ OK (Low score -> Core)")
                 else:
                      print(f"  ❌ FAIL (Expected {expected})")
        else:
             print("  -> No match (Core)")
             if expected == "core":
                 print("  ✅ OK")
             else:
                 print(f"  ❌ FAIL (Expected {expected})")

def test_schema_structure():
    print("\n=== Testing Schema Structure ===")
    model = CartongessoProperties()
    defaults = model.dict()
    print(f"Cartongesso keys: {list(defaults.keys())}")
    
    # Check inheritance
    assert "material" in defaults, "Should inherit from Core"
    assert "frame_type" in defaults, "Should have specific fields"
    
    print("✅ Schema inheritance looks correct")

if __name__ == "__main__":
    test_router()
    test_schema_structure()

