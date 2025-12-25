from .core import CoreProperties, EvidenceSlot


class RivestimentiProperties(CoreProperties):
    """Estensione per rivestimenti."""

    # === PRODUTTORE ===
    manufacturer: EvidenceSlot = EvidenceSlot()
    # es. "Marca X", "Produttore Y"

    # === FORMATO ===
    tile_format: EvidenceSlot = EvidenceSlot()
    # es. "30x60", "60x120"

    # === POSA ===
    laying_method: EvidenceSlot = EvidenceSlot()
    # es. "incollato", "a correre"

    # === SUPPORTO ===
    substrate: EvidenceSlot = EvidenceSlot()
    # es. "intonaco", "cartongesso", "massetto"
