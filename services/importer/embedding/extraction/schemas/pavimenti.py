from .core import CoreProperties, EvidenceSlot


class PavimentiProperties(CoreProperties):
    """Estensione per pavimenti e rivestimenti."""

    # === PRODUTTORE ===
    manufacturer: EvidenceSlot = EvidenceSlot()
    # es. "Marca X", "Produttore Y"

    # === FORMATO ===
    tile_format: EvidenceSlot = EvidenceSlot()
    # es. "60x60", "30x60", "listone"

    # === POSA ===
    laying_method: EvidenceSlot = EvidenceSlot()
    # es. "incollato", "flottante", "a correre", "a spina"

    # === SOTTOFONDO ===
    substrate: EvidenceSlot = EvidenceSlot()
    # es. "massetto", "autolivellante"

    # === CLASSIFICAZIONE ===
    slip_resistance: EvidenceSlot = EvidenceSlot()
    # es. "R9", "R10", "R11"

    abrasion_class: EvidenceSlot = EvidenceSlot()
    # es. "PEI IV", "PEI V"
