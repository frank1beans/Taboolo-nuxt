from .core import CoreProperties, EvidenceSlot


class ApparecchiSanitariProperties(CoreProperties):
    """Estensione per apparecchi sanitari e accessori."""

    # === TIPOLOGIA ===
    fixture_type: EvidenceSlot = EvidenceSlot()
    # es. "WC", "bidet", "lavabo", "rubinetteria", "specchio", "doccia"

    installation_type: EvidenceSlot = EvidenceSlot()
    # es. "sospeso", "a pavimento", "da appoggio", "da incasso"

    flush_type: EvidenceSlot = EvidenceSlot()
    # es. "cassetta incasso", "scarico a pavimento", "scarico a parete"
