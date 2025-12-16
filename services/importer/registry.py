"""
Parser registry - dispatches to appropriate parser based on format.
Supports both New Domain Parsers (Six) and Legacy Function Parsers (Excel/Returns).
"""
from __future__ import annotations

import os
import tempfile
from pathlib import Path
from typing import Callable, Dict, Literal, Type, Any

# New Domain Imports
from core.interfaces import ParserProtocol
from parsers.six.parser import SixParser

# Legacy Shared Imports
from parsers.shared.base_types import NormalizedEstimate
from parsers.shared.normalize import normalize_estimate

# Legacy Parsers Imports
from parsers.excel.parser import parse_estimate_excel
from parsers.lx.parser import parse_lx_return_excel
from parsers.mx.parser import parse_mx_return_excel

# ---------------------------------------------------------------------------
# NEW REGISTRY (For Domain/Raw API)
# ---------------------------------------------------------------------------

_PARSERS: Dict[str, Type[ParserProtocol]] = {
    "six": SixParser,
}

def get_parser(format_hint: str) -> ParserProtocol:
    """
    Factory to retrieve a parser instance by format name (New System).
    """
    parser_cls = _PARSERS.get(format_hint)
    if not parser_cls:
        # Fallback handling or raise error
        raise ValueError(f"No parser found for format: {format_hint}")
    
    return parser_cls()

# ---------------------------------------------------------------------------
# LEGACY REGISTRY (For Returns API / Compatibility)
# ---------------------------------------------------------------------------

ParserFn = Callable[..., NormalizedEstimate]
FormatHint = Literal["six", "lx", "mx", "excel"]

def _with_tempfile(file_bytes: bytes, filename: str | None) -> Path:
    suffix = Path(filename or "").suffix
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix or ".tmp")
    tmp.write(file_bytes)
    tmp.flush()
    tmp.close()
    return Path(tmp.name)

# NOTE: Six is now handled by the new parser in raw.py, but we keep this stub 
# if legacy returns logic ever tries to parse SIX (unlikely for returns).
def parse_six_estimate_from_bytes(
    *,
    file_bytes: bytes,
    filename: str | None = None,
) -> NormalizedEstimate:
    # Bridge to new parser if needed, or raise error. 
    # For now, simplistic bridge using new parser but returning legacy type? 
    # Risk of schema mismatch. 
    # Better to raise error as "Six Returns" isn't a standard flow.
    raise NotImplementedError("Use new Raw API for SIX files.")

def parse_excel_estimate_from_bytes(
    *,
    file_bytes: bytes,
    filename: str | None = None,
    sheet_name: str | None = None,
    price_column: str | None = None,
    quantity_column: str | None = None,
) -> NormalizedEstimate:
    path = _with_tempfile(file_bytes, filename)
    try:
        parsed = parse_estimate_excel(
            file_path=path,
            sheet_name=sheet_name,
            price_column=price_column,
            quantity_column=quantity_column,
        )
        return normalize_estimate(parsed, format="excel", source="excel")
    finally:
        try:
            os.remove(path)
        except FileNotFoundError:
            pass

def parse_lx_estimate_from_bytes(
    *,
    file_bytes: bytes,
    filename: str | None = None,
    sheet_name: str | None = None,
    code_columns: list[str] | None = None,
    description_columns: list[str] | None = None,
    price_column: str | None = None,
    quantity_column: str | None = None,
    progressive_column: str | None = None,
) -> NormalizedEstimate:
    path = _with_tempfile(file_bytes, filename)
    try:
        parsed = parse_lx_return_excel(
            file_path=path,
            sheet_name=sheet_name,
            code_columns=code_columns or [],
            description_columns=description_columns or [],
            price_column=price_column or "",
            quantity_column=quantity_column,
            progressive_column=progressive_column,
        )
        return normalize_estimate(parsed, format="lx", source="excel")
    finally:
        try:
            os.remove(path)
        except FileNotFoundError:
            pass

def parse_mx_estimate_from_bytes(
    *,
    file_bytes: bytes,
    filename: str | None = None,
    sheet_name: str | None = None,
    code_columns: list[str] | None = None,
    description_columns: list[str] | None = None,
    price_column: str | None = None,
    quantity_column: str | None = None,
    progressive_column: str | None = None,
) -> NormalizedEstimate:
    path = _with_tempfile(file_bytes, filename)
    try:
        parsed = parse_mx_return_excel(
            file_path=path,
            sheet_name=sheet_name,
            code_columns=code_columns or [],
            description_columns=description_columns or [],
            price_column=price_column or "",
            quantity_column=quantity_column,
            progressive_column=progressive_column,
        )
        return normalize_estimate(parsed, format="mx", source="excel")
    finally:
        try:
            os.remove(path)
        except FileNotFoundError:
            pass

PARSERS_BY_FORMAT: dict[FormatHint, ParserFn] = {
    "six": parse_six_estimate_from_bytes,
    "lx": parse_lx_estimate_from_bytes,
    "mx": parse_mx_estimate_from_bytes,
    "excel": parse_excel_estimate_from_bytes,
}

def parse_estimate_from_bytes(
    format_hint: FormatHint,
    *,
    file_bytes: bytes,
    filename: str | None = None,
    **kwargs,
) -> NormalizedEstimate:
    parser = PARSERS_BY_FORMAT.get(format_hint)
    if parser is None:
        raise ValueError(f"Unsupported format '{format_hint}'")
    return parser(file_bytes=file_bytes, filename=filename, **kwargs)

__all__ = [
    "get_parser",
    "parse_estimate_from_bytes",
    "parse_six_estimate_from_bytes",
    "parse_lx_estimate_from_bytes",
    "parse_mx_estimate_from_bytes",
    "parse_excel_estimate_from_bytes",
]
