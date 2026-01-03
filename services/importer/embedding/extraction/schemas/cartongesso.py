from .core import CoreProperties, EvidenceSlot

class CartongessoProperties(CoreProperties):
    """Estensione per pareti in cartongesso."""
    
    # === ORDITURA ===
    frame_type: EvidenceSlot = EvidenceSlot()
    # es. "singola", "doppia", "a C", "a U"
    
    frame_spacing_mm: EvidenceSlot = EvidenceSlot()
    # es. "600", "400"
    
    frame_material: EvidenceSlot = EvidenceSlot()
    # es. "acciaio zincato", "legno"

    frame_thickness_mm: EvidenceSlot = EvidenceSlot()
    # es. "0.6", "0.8"
    
    # === LASTRE ===
    board_type: EvidenceSlot = EvidenceSlot()
    # es. "standard", "idrofugo (H)", "antincendio (F)", "ad alta densità"
    
    board_layers: EvidenceSlot = EvidenceSlot()
    # es. "1", "2", "doppia lastra"
    
    # === ISOLAMENTO ===
    insulation_type: EvidenceSlot = EvidenceSlot()
    # es. "lana di roccia", "lana di vetro", "polistirene"
    
    insulation_thickness_mm: EvidenceSlot = EvidenceSlot()
    
    # === PARETE ===
    wall_total_thickness_mm: EvidenceSlot = EvidenceSlot()
    # es. "100", "125", "150"
