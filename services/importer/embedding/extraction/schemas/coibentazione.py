from .core import CoreProperties, EvidenceSlot


class CoibentazioneProperties(CoreProperties):
    """Estensione per coibentazioni e isolanti."""

    # === ISOLANTE ===
    insulation_type: EvidenceSlot = EvidenceSlot()
    # es. "lana di roccia", "EPS", "XPS", "poliuretano"

    insulation_thickness_mm: EvidenceSlot = EvidenceSlot()
    # es. "80", "120"

    lambda_w_mk: EvidenceSlot = EvidenceSlot()
    # es. "0.036 W/mK"

    density_kg_m3: EvidenceSlot = EvidenceSlot()
    # es. "80 kg/m3"

    panel_format: EvidenceSlot = EvidenceSlot()
    # es. "1200x600"
