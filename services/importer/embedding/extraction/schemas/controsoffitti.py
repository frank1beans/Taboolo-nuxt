from .core import CoreProperties, EvidenceSlot


class ControsoffittiProperties(CoreProperties):
    """Estensione per controsoffitti."""

    # === SISTEMA ===
    ceiling_system: EvidenceSlot = EvidenceSlot()
    # es. "a vista", "ispezionabile", "baffles"

    panel_material: EvidenceSlot = EvidenceSlot()
    # es. "fibra minerale", "metallo", "cartongesso", "legno", "pvc"

    panel_thickness_mm: EvidenceSlot = EvidenceSlot()
    # es. "15", "20"

    panel_format: EvidenceSlot = EvidenceSlot()
    # es. "60x60", "120x60"

    suspension_type: EvidenceSlot = EvidenceSlot()
    # es. "pendini", "sospeso", "autoportante"

    grid_type: EvidenceSlot = EvidenceSlot()
    # es. "T24", "T15", "a scomparsa"
