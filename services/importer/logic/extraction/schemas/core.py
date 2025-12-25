from typing import Optional, Dict, Any, Union, List
from pydantic import BaseModel, Field

class EvidenceSlot(BaseModel):
    """Singolo slot estratto con evidenza. Supports single values or lists for multi-layer items."""
    value: Optional[Union[str, int, float, List[Any]]] = None
    evidence: Optional[Union[str, List[str]]] = None  # Substring(s) dal testo originale
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    
    def is_valid(self, min_confidence: float = 0.5) -> bool:
        return self.value is not None and self.confidence >= min_confidence


class CoreProperties(BaseModel):
    """Schema CORE - proprietà stabili trans-categoriche."""
    
    # === MATERIALE BASE ===
    material: EvidenceSlot = EvidenceSlot()
    # es. "cartongesso", "ceramica", "PVC", "alluminio"
    
    # === DIMENSIONI ===
    thickness_mm: EvidenceSlot = EvidenceSlot()
    # es. "12.5", "15", "20"
    
    width_cm: EvidenceSlot = EvidenceSlot()
    height_cm: EvidenceSlot = EvidenceSlot()
    
    # === FINITURA/TRATTAMENTO ===
    finish: EvidenceSlot = EvidenceSlot()
    # es. "lucido", "satinato", "verniciato", "grezzo"
    
    # === CERTIFICAZIONI/CLASSI ===
    fire_class: EvidenceSlot = EvidenceSlot()
    # es. "REI 120", "Classe A1", "EI 60"
    
    acoustic_class: EvidenceSlot = EvidenceSlot()
    # es. "Rw 48 dB"
    
    # === BRAND/PRODUTTORE (opzionale) ===
    brand: EvidenceSlot = EvidenceSlot()
    
    def get_valid_slots(self, min_confidence: float = 0.5) -> Dict[str, Any]:
        """Ritorna solo gli slot validi."""
        return {
            k: v.model_dump() for k, v in self.__dict__.items()
            if isinstance(v, EvidenceSlot) and v.is_valid(min_confidence)
        }
