import re
from typing import Any, Dict, List, Optional


NUMERIC_MM_FIELDS = {
    "thickness_mm",
    "frame_spacing_mm",
    "frame_thickness_mm",
    "insulation_thickness_mm",
    "wall_total_thickness_mm",
    "panel_thickness_mm",
}

NUMERIC_CM_FIELDS = {
    "width_cm",
    "height_cm",
}


def _normalize_text(value: str) -> str:
    return " ".join(value.strip().split())


def _extract_number(value: str) -> Optional[float]:
    match = re.search(r"(\d+(?:[.,]\d+)?)", value)
    if not match:
        return None
    return float(match.group(1).replace(",", "."))


def _normalize_numeric(value: Any, prefer_unit: str) -> Any:
    if value is None:
        return None
    if isinstance(value, list):
        return [v for v in (_normalize_numeric(v, prefer_unit) for v in value) if v is not None]
    if isinstance(value, (int, float)):
        return float(value)
    if not isinstance(value, str):
        return value

    text = value.lower()
    number = _extract_number(text)
    if number is None:
        return value

    if prefer_unit == "mm":
        if "cm" in text and "mm" not in text:
            return number * 10.0
        return number

    if prefer_unit == "cm":
        if "mm" in text and "cm" not in text:
            return number / 10.0
        return number

    return number


def _normalize_fire_class(value: Any) -> Any:
    if not isinstance(value, str):
        return value
    text = _normalize_text(value)
    match = re.match(r"(?i)\b(rei|ei)\s*([0-9]+)\b", text.replace(" ", ""))
    if match:
        return f"{match.group(1).upper()} {match.group(2)}"
    return text


def _normalize_board_layers(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return int(value)
    if isinstance(value, str):
        text = value.lower()
        if "doppia" in text or "double" in text:
            return 2
        if "tripla" in text or "triple" in text:
            return 3
        if "mono" in text or "singola" in text:
            return 1
        number = _extract_number(text)
        if number is not None:
            return int(number)
    return value


def _dedupe_list(values: List[Any]) -> List[Any]:
    seen = set()
    output = []
    for item in values:
        key = item
        if isinstance(item, str):
            key = item.lower()
        if key in seen:
            continue
        seen.add(key)
        output.append(item)
    return output


def _normalize_board_type(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, list):
        normalized = []
        for entry in value:
            item = _normalize_board_type(entry)
            if item is None:
                continue
            if isinstance(item, list):
                normalized.extend(item)
            else:
                normalized.append(item)
        normalized = _dedupe_list(normalized)
        return normalized if normalized else None
    if not isinstance(value, str):
        return value

    text = _normalize_text(value)
    lower = text.lower()

    if "gkfi" in lower:
        return "GKF"
    if "gkf" in lower:
        return "GKF"
    if "gkb" in lower:
        return "GKB"

    match = re.search(r"fireguard\s*([0-9]+(?:[.,][0-9]+)?)", lower)
    if match:
        return f"Fireguard {match.group(1).replace(',', '.')}"
    if "fireguard" in lower:
        return "Fireguard"
    if "diamant" in lower:
        return "Diamant"
    if "ignilastra" in lower:
        return "Ignilastra"

    return text


def _normalize_frame_type(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, list):
        normalized = []
        for entry in value:
            item = _normalize_frame_type(entry)
            if item is None:
                continue
            if isinstance(item, list):
                normalized.extend(item)
            else:
                normalized.append(item)
        normalized = _dedupe_list(normalized)
        return normalized if normalized else None
    if not isinstance(value, str):
        return value

    text = _normalize_text(value).lower()
    if "singola" in text or "mono" in text or "single" in text:
        return "singola"
    if "doppia" in text or "double" in text:
        return "doppia"
    if "a c" in text or "profilo c" in text or "a-c" in text:
        return "a C"
    if "a u" in text or "profilo u" in text or "a-u" in text:
        return "a U"

    return None


def _normalize_slot(key: str, slot: Dict[str, Any]) -> Dict[str, Any]:
    value = slot.get("value")

    if isinstance(value, str):
        value = _normalize_text(value)

    if key in NUMERIC_MM_FIELDS:
        value = _normalize_numeric(value, "mm")
    elif key in NUMERIC_CM_FIELDS:
        value = _normalize_numeric(value, "cm")
    elif key == "board_layers":
        value = _normalize_board_layers(value)
    elif key == "board_type":
        value = _normalize_board_type(value)
    elif key == "frame_type":
        value = _normalize_frame_type(value)
    elif key == "fire_class":
        value = _normalize_fire_class(value)

    slot["value"] = value
    if key == "frame_type" and not value:
        slot["value"] = None
        slot["evidence"] = None
    return slot


def postprocess_properties(
    extracted: Dict[str, Dict[str, Any]],
    min_confidence: float = 0.0,
) -> Dict[str, Dict[str, Any]]:
    processed: Dict[str, Dict[str, Any]] = {}

    for key, slot in extracted.items():
        if not isinstance(slot, dict):
            continue

        confidence = slot.get("confidence", 0.0) or 0.0
        if confidence < min_confidence:
            processed[key] = {"value": None, "evidence": None, "confidence": confidence}
            continue

        processed[key] = _normalize_slot(key, dict(slot))

    return processed
