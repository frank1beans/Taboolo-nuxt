from .core import CoreProperties, EvidenceSlot


class SerramentiProperties(CoreProperties):
    """Estensione per porte e serramenti."""

    # === TIPOLOGIA ===
    door_type: EvidenceSlot = EvidenceSlot()
    # es. "a battente", "scorrevole", "a libro", "REI"

    leaf_count: EvidenceSlot = EvidenceSlot()
    # es. "1 anta", "2 ante"

    # === TELAIO ===
    frame_material: EvidenceSlot = EvidenceSlot()
    # es. "legno", "alluminio", "PVC", "acciaio"

    frame_profile: EvidenceSlot = EvidenceSlot()
    # es. "a taglio termico", "standard"

    # === VETRO ===
    glass_type: EvidenceSlot = EvidenceSlot()
    # es. "doppio", "triplo", "stratificato", "camera"

    glass_thickness_mm: EvidenceSlot = EvidenceSlot()
    # es. "4+16+4", "6/12/6"

    # === PRESTAZIONI ===
    u_value: EvidenceSlot = EvidenceSlot()
    # es. "1.3 W/m2K"
