from .core import CoreProperties, EvidenceSlot


class ImpermeabilizzazioneProperties(CoreProperties):
    """Estensione per impermeabilizzazioni."""

    # === SISTEMA ===
    system_type: EvidenceSlot = EvidenceSlot()
    # es. "bituminoso", "sintetico", "liquido", "resina"

    membrane_type: EvidenceSlot = EvidenceSlot()
    # es. "membrana elastomerica", "guaina"

    layer_count: EvidenceSlot = EvidenceSlot()
    # es. "1", "2"

    reinforcement: EvidenceSlot = EvidenceSlot()
    # es. "armata in poliestere", "fibra di vetro"

    application_method: EvidenceSlot = EvidenceSlot()
    # es. "a fiamma", "a freddo", "a rullo"
