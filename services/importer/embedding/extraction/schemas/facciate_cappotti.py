from .core import CoreProperties, EvidenceSlot


class FacciateCappottiProperties(CoreProperties):
    """Estensione per facciate e cappotti."""

    # === SISTEMA FACCIATA ===
    facade_system: EvidenceSlot = EvidenceSlot()
    # es. "ventilata", "curtain wall", "doppia pelle", "cappotto"

    cladding_material: EvidenceSlot = EvidenceSlot()
    # es. "ceramica", "HPL", "lamiera", "pietra"

    # === ISOLAMENTO (cappotto) ===
    insulation_type: EvidenceSlot = EvidenceSlot()
    # es. "EPS", "XPS", "lana di roccia"

    insulation_thickness_mm: EvidenceSlot = EvidenceSlot()
    # es. "80", "120"

    fixing_system: EvidenceSlot = EvidenceSlot()
    # es. "meccanico", "incollato", "tasselli"

    # === COMPONENTI VETRATI (facciata) ===
    frame_material: EvidenceSlot = EvidenceSlot()
    # es. "alluminio", "acciaio"

    glass_type: EvidenceSlot = EvidenceSlot()
    # es. "doppio", "triplo", "stratificato"

    u_value: EvidenceSlot = EvidenceSlot()
    # es. "1.3 W/m2K"
