from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field


class EvidenceSlot(BaseModel):
    value: Optional[Union[str, int, float, List[Any]]] = None
    evidence: Optional[Union[str, List[str]]] = None
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class ExtractedProperties(BaseModel):
    """Typed container for extracted properties payloads."""

    properties: Dict[str, EvidenceSlot] = Field(default_factory=dict)

    def to_dict(self) -> Dict[str, Dict[str, Any]]:
        return {key: slot.model_dump() for key, slot in self.properties.items()}
