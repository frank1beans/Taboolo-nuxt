"""
Analytics Helper Functions
Utility functions for data processing, text cleaning, embeddings
"""

import re
import hashlib
from typing import List, Optional, Dict, Any, Tuple

from embedding.extraction.props_text import build_weighted_props_text


def grav_dump(params) -> Dict[str, Any]:
    """Pydantic v1/v2 compatible dict dump."""
    if params is None:
        return {}
    if hasattr(params, "model_dump"):
        return params.model_dump()
    return params.dict()


def clean_wbs_desc(desc: str, code: str) -> str:
    """Removes the code prefix and separators from WBS description, normalizes text."""
    if not desc:
        return ""
    
    cleaned = desc.strip()
    
    # Remove code prefix if present (at start or anywhere)
    if code:
        if cleaned.startswith(code):
            cleaned = cleaned[len(code):].strip()
        # Also try without leading zeros (A020 -> A20)
        code_alt = code.lstrip("0") if code[0].isdigit() else code
        if cleaned.startswith(code_alt):
            cleaned = cleaned[len(code_alt):].strip()
    
    # Remove separator chars if present (-, –, :, .)
    while cleaned and cleaned[0] in "-–:.":
        cleaned = cleaned[1:].strip()
    
    # Normalize whitespace (collapse multiple spaces)
    cleaned = re.sub(r'\s+', ' ', cleaned)
    
    # Normalize to title case for consistency
    cleaned = cleaned.strip().title()
    
    return cleaned if cleaned else desc


def pick_description(doc: Dict[str, Any]) -> str:
    """Pick the best description field from a document."""
    return (
        (doc.get("extended_description") or "").strip()
        or (doc.get("extendedDescription") or "").strip()
        or (doc.get("long_description") or "").strip()
        or (doc.get("longDescription") or "").strip()
        or (doc.get("description") or "").strip()
    )


def build_detail_text(extracted_props: Optional[Dict[str, Any]], min_confidence: float) -> str:
    """Build a text representation of extracted properties."""
    if not extracted_props:
        return ""
    parts: List[str] = []
    for key, slot in extracted_props.items():
        if not isinstance(slot, dict):
            continue
        value = slot.get("value")
        confidence = float(slot.get("confidence", 0.0) or 0.0)
        if value is None or confidence < min_confidence:
            continue
        if isinstance(value, list):
            value_text = ", ".join(str(v) for v in value)
        else:
            value_text = str(value)
        parts.append(f"{key}: {value_text}")
    return " | ".join(parts)


def build_props_text(
    extracted_props: Optional[Dict[str, Any]],
    min_confidence: float,
    use_weighted_props: bool,
    props_replication_k: int,
    category: Optional[str] = None,
    wbs6_text: Optional[str] = None,
) -> str:
    """Build properties text with optional weighting."""
    if use_weighted_props:
        return build_weighted_props_text(
            extracted_props if isinstance(extracted_props, dict) else {},
            category=category,
            wbs6_text=wbs6_text,
            k=props_replication_k,
            min_confidence=min_confidence,
        )
    return build_detail_text(extracted_props, min_confidence)


def normalize_weights(base_weight: float, detail_weight: float) -> Tuple[float, float]:
    """Normalize weights to sum to 1."""
    total = base_weight + detail_weight
    if total <= 0:
        return 0.5, 0.5
    return base_weight / total, detail_weight / total


def hash_text(text: str) -> str:
    """Generate a SHA1 hash of text."""
    if not text:
        return ""
    return hashlib.sha1(text.encode("utf-8")).hexdigest()


def has_meaningful_value(value: Any) -> bool:
    """Check if a value is meaningful (not empty/None)."""
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, list):
        return any(has_meaningful_value(v) for v in value)
    return True


def trim_extracted_properties(raw_props: Any) -> Dict[str, Dict[str, Any]]:
    """Trim extracted properties to only keep meaningful values."""
    if not isinstance(raw_props, dict):
        return {}

    trimmed: Dict[str, Dict[str, Any]] = {}
    for key, slot in raw_props.items():
        if isinstance(slot, dict):
            value = slot.get("value")
            if isinstance(value, list):
                value = [v for v in value if has_meaningful_value(v)]
            if not has_meaningful_value(value):
                continue

            trimmed[key] = {
                "value": value,
                "evidence": slot.get("evidence"),
                "confidence": float(slot.get("confidence", 0.0) or 0.0),
            }
        else:
            if not has_meaningful_value(slot):
                continue
            trimmed[key] = {
                "value": slot,
                "evidence": None,
                "confidence": 0.0,
            }

    return trimmed

