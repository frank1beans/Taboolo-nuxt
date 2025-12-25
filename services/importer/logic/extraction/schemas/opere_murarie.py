from .core import CoreProperties, EvidenceSlot


class OpereMurarieProperties(CoreProperties):
    """Estensione per opere murarie."""

    # === BLOCCO ===
    block_type: EvidenceSlot = EvidenceSlot()
    # es. "laterizio", "calcestruzzo cellulare", "vibrocompresso"

    block_format: EvidenceSlot = EvidenceSlot()
    # es. "25x12x19"

    compressive_strength_mpa: EvidenceSlot = EvidenceSlot()
    # es. "5 MPa", "10 MPa"

    density_kg_m3: EvidenceSlot = EvidenceSlot()
    # es. "600 kg/m3"

    mortar_type: EvidenceSlot = EvidenceSlot()
    # es. "malta cementizia", "allettamento a secco"
