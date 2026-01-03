"""
Parser registry - dispatches to appropriate parser based on format.
Supports both New Domain Parsers (Six) and Legacy Function Parsers (Excel/Returns).
"""
from __future__ import annotations

import os
import tempfile
from pathlib import Path
from typing import Dict, Type

# New Domain Imports
from core.interfaces import ParserProtocol
from parsers.six.parser import SixParser
from parsers.xpwe.parser import PrimusXpweParser

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
    "xpwe": PrimusXpweParser,
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

def _with_tempfile(file_bytes: bytes, filename: str | None) -> Path:
    suffix = Path(filename or "").suffix
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix or ".tmp")
    tmp.write(file_bytes)
    tmp.flush()
    tmp.close()
    return Path(tmp.name)

def parse_excel_estimate_from_bytes(
    *,
    file_bytes: bytes,
    filename: str | None = None,
    sheet_name: str | None = None,
    price_column: str | None = None,
    quantity_column: str | None = None,
    **kwargs,
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
    header_row_index: int | None = None,
    long_description_columns: list[str] | None = None,
    **kwargs,
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
            header_row_index=header_row_index,
            long_description_columns=long_description_columns,
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
    **kwargs,
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

__all__ = [
    "get_parser",
    "parse_lx_estimate_from_bytes",
    "parse_mx_estimate_from_bytes",
    "parse_excel_estimate_from_bytes",
]
