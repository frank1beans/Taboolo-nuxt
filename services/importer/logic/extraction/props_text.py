import re
from typing import Any, Dict, List, Optional, Tuple

from .router import FamilyRouter


_TOKEN_CLEAN_RE = re.compile(r"[^a-z0-9_:\-\.]+")

_CATEGORY_ALIASES = {
    "porte": "serramenti",
    "porte_serramenti": "serramenti",
    "porte_serramenti_interni": "serramenti",
    "serramenti": "serramenti",
    "cartongesso": "cartongesso",
    "controsoffitti": "controsoffitti",
    "coibentazione": "coibentazione",
    "facciatecappotti": "facciate_cappotti",
    "facciate_cappotti": "facciate_cappotti",
    "facciate_e_cappotti": "facciate_cappotti",
    "impermeabilizzazione": "impermeabilizzazione",
    "opere_murarie": "opere_murarie",
    "pavimenti": "pavimenti",
    "rivestimenti": "rivestimenti",
    "apparecchi_sanitari": "apparecchi_sanitari",
}

_GENERAL_WEIGHTS = {
    "material": 2.0,
    "thickness_mm": 2.0,
    "size": 1.5,
    "fire_class": 3.0,
    "acoustic_class": 1.0,
    "brand": 0.25,
    "ral": 0.5,
    "finish_type": 0.5,
    "texture": 0.5,
}

_CATEGORY_WEIGHTS = {
    "serramenti": {
        "fire_class": 3.0,
        "door_type": 3.0,
        "leaf_count": 3.0,
        "material": 2.0,
        "frame_material": 2.0,
        "size": 2.0,
        "acoustic_class": 1.0,
        "ral": 0.5,
        "finish_type": 0.5,
        "texture": 0.5,
        "brand": 0.25,
    },
    "cartongesso": {
        "board_type": 3.0,
        "board_layers": 3.0,
        "wall_total_thickness_mm": 3.0,
        "frame_type": 2.0,
        "frame_spacing_mm": 1.5,
        "insulation_type": 1.5,
        "insulation_thickness_mm": 1.5,
    },
    "controsoffitti": {
        "ceiling_system": 3.0,
        "panel_material": 3.0,
        "grid_type": 2.0,
        "panel_format": 1.5,
        "panel_thickness_mm": 1.5,
        "suspension_type": 1.0,
    },
    "coibentazione": {
        "insulation_type": 3.0,
        "insulation_thickness_mm": 3.0,
        "lambda_w_mk": 2.0,
        "density_kg_m3": 1.5,
        "panel_format": 1.0,
    },
    "facciate_cappotti": {
        "facade_system": 3.0,
        "cladding_material": 3.0,
        "insulation_type": 3.0,
        "insulation_thickness_mm": 3.0,
        "fixing_system": 2.0,
        "frame_material": 1.5,
        "glass_type": 1.5,
        "u_value": 1.5,
    },
    "impermeabilizzazione": {
        "system_type": 3.0,
        "membrane_type": 3.0,
        "layer_count": 3.0,
        "application_method": 2.0,
        "reinforcement": 1.5,
    },
    "opere_murarie": {
        "block_type": 3.0,
        "block_format": 2.0,
        "mortar_type": 1.5,
        "density_kg_m3": 1.5,
        "compressive_strength_mpa": 1.5,
    },
    "pavimenti": {
        "tile_format": 3.0,
        "laying_method": 3.0,
        "substrate": 1.5,
        "slip_resistance": 2.0,
        "abrasion_class": 1.5,
        "manufacturer": 0.5,
        "brand": 0.5,
    },
    "rivestimenti": {
        "tile_format": 3.0,
        "laying_method": 3.0,
        "substrate": 1.5,
        "manufacturer": 0.5,
        "brand": 0.5,
    },
    "apparecchi_sanitari": {
        "fixture_type": 3.0,
        "installation_type": 2.0,
        "flush_type": 1.5,
        "brand": 0.5,
    },
}

_FINISH_TYPE_PATTERNS = {
    "polveri": [r"\bpolveri\b", r"\bpolvere\b", r"\bpowder\b"],
    "zincatura": [r"\bzincat\w*\b"],
    "anodizzato": [r"\banodizz\w*\b"],
    "verniciato": [r"\bverniciat\w*\b"],
}

_TEXTURE_PATTERNS = {
    "goffrato": [r"\bgoffrat\w*\b"],
    "liscio": [r"\blisci\w*\b"],
    "antigraffio": [r"\banti\s*graff\w*\b", r"\bantigraff\w*\b"],
}

_ROUTER: Optional[FamilyRouter] = None


def _get_router() -> FamilyRouter:
    global _ROUTER
    if _ROUTER is None:
        _ROUTER = FamilyRouter()
    return _ROUTER


def slugify(text: Any) -> str:
    if text is None:
        return ""
    cleaned = str(text).strip().lower()
    cleaned = re.sub(r"\s+", "_", cleaned)
    cleaned = _TOKEN_CLEAN_RE.sub("", cleaned)
    cleaned = re.sub(r"_+", "_", cleaned)
    return cleaned.strip("_")


def parse_finish_microtokens(text: Optional[str]) -> List[str]:
    if not text:
        return []
    lower = str(text).lower()
    tokens: List[str] = []

    match = re.search(r"\bral\s*([0-9]{3,4})\b", lower)
    if match:
        tokens.append(f"ral:{match.group(1)}")

    for token, patterns in _FINISH_TYPE_PATTERNS.items():
        if any(re.search(p, lower) for p in patterns):
            tokens.append(f"finish_type:{token}")

    for token, patterns in _TEXTURE_PATTERNS.items():
        if any(re.search(p, lower) for p in patterns):
            tokens.append(f"texture:{token}")

    return tokens


def _normalize_category(category: Optional[str]) -> Optional[str]:
    if not category:
        return None
    slug = slugify(category).replace("-", "_").replace(".", "_")
    slug = re.sub(r"_+", "_", slug)
    return _CATEGORY_ALIASES.get(slug, slug)


def get_category_weights(category: Optional[str]) -> Dict[str, float]:
    weights = dict(_GENERAL_WEIGHTS)
    normalized = _normalize_category(category)
    if normalized and normalized in _CATEGORY_WEIGHTS:
        weights.update(_CATEGORY_WEIGHTS[normalized])
    return weights


def _clamp_confidence(value: Any) -> float:
    try:
        conf = float(value)
    except (TypeError, ValueError):
        return 0.0
    if conf < 0.0:
        return 0.0
    if conf > 1.0:
        return 1.0
    return conf


def _format_scalar(value: Any) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        if isinstance(value, float) and value.is_integer():
            return str(int(value))
        if isinstance(value, float):
            return f"{value:.3f}".rstrip("0").rstrip(".")
        return str(value)
    return str(value)


def _flatten_values(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        flattened: List[str] = []
        for entry in value:
            flattened.extend(_flatten_values(entry))
        return flattened
    return [_format_scalar(value)]


def _extract_slot(slot: Any) -> Tuple[Any, float]:
    if isinstance(slot, dict):
        return slot.get("value"), _clamp_confidence(slot.get("confidence", 0.0))
    return slot, 0.0


def _pick_first(value: Any) -> Any:
    if isinstance(value, list):
        for entry in value:
            if entry is None:
                continue
            if isinstance(entry, str) and not entry.strip():
                continue
            return entry
        return None
    return value


def _rep_count(base_weight: float, confidence: float, k: int) -> int:
    if base_weight <= 0:
        return 0
    eff = base_weight * confidence
    return int(round(k * eff))


def _tokenize(key: str, value: Any) -> str:
    key_slug = slugify(key)
    value_slug = slugify(value)
    if not key_slug or not value_slug:
        return ""
    return f"{key_slug}:{value_slug}"


def _resolve_category(category: Optional[str], wbs6_text: Optional[str]) -> Optional[str]:
    normalized = _normalize_category(category)
    if normalized:
        return normalized
    if wbs6_text:
        router = _get_router()
        return router.get_best_family_from_wbs6(wbs6_text)
    return None


def build_weighted_props_text(
    extracted_properties: Optional[Dict[str, Any]],
    category: Optional[str] = None,
    wbs6_text: Optional[str] = None,
    k: int = 3,
    min_confidence: float = 0.0,
) -> str:
    if not extracted_properties:
        return ""

    category_key = _resolve_category(category, wbs6_text)
    weights = get_category_weights(category_key)

    tokens: List[str] = []

    width_val, width_conf = _extract_slot(extracted_properties.get("width_cm"))
    height_val, height_conf = _extract_slot(extracted_properties.get("height_cm"))
    width_val = _pick_first(width_val)
    height_val = _pick_first(height_val)
    if width_val is not None and height_val is not None:
        size_weight = weights.get("size")
        if size_weight:
            size_conf = (width_conf + height_conf) / 2.0
            if size_conf >= min_confidence:
                size_value = f"{_format_scalar(width_val)}x{_format_scalar(height_val)}"
                reps = _rep_count(size_weight, size_conf, k)
                if reps >= 1:
                    token = _tokenize("size", size_value)
                    if token:
                        tokens.extend([token] * reps)

    finish_value, finish_conf = _extract_slot(extracted_properties.get("finish"))
    finish_value = _pick_first(finish_value)
    if finish_value:
        for micro in parse_finish_microtokens(str(finish_value)):
            if ":" not in micro:
                continue
            key, value = micro.split(":", 1)
            base_weight = weights.get(key)
            if base_weight is None or finish_conf < min_confidence:
                continue
            reps = _rep_count(base_weight, finish_conf, k)
            if reps < 1:
                continue
            token = _tokenize(key, value)
            if token:
                tokens.extend([token] * reps)

    for key in sorted(extracted_properties.keys()):
        if key in {"finish", "width_cm", "height_cm"}:
            continue
        base_weight = weights.get(key)
        if base_weight is None:
            continue

        value, confidence = _extract_slot(extracted_properties.get(key))
        if value is None:
            continue
        confidence = _clamp_confidence(confidence)
        if confidence < min_confidence:
            continue

        reps = _rep_count(base_weight, confidence, k)
        if reps < 1:
            continue

        for entry in _flatten_values(value):
            token = _tokenize(key, entry)
            if token:
                tokens.extend([token] * reps)

    return " ".join(tokens)
