from typing import Dict

# Canonical WBS Levels for Taboolo (Standard 01-07)
CANONICAL_WBS_LEVELS: Dict[str, Dict[str, str]] = {
    "01": {"code": "01", "description": "Lotto/Edificio"},
    "02": {"code": "02", "description": "Livelli"},
    "03": {"code": "03", "description": "Ambiti omogenei"},
    "04": {"code": "04", "description": "Appalto"},
    "05": {"code": "05", "description": "Elementi Funzionali"},
    "06": {"code": "06", "description": "Categorie merceologiche"},
    "07": {"code": "07", "description": "Raggruppatore EPU"},
}

def get_canonical_wbs_kind(level_code: str) -> str:
    """Returns the description for a given canonical level code (e.g. '01' -> 'Lotto/Edificio')"""
    if level_code in CANONICAL_WBS_LEVELS:
        return CANONICAL_WBS_LEVELS[level_code]["description"]
    return "Custom"
