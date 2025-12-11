from __future__ import annotations

import os
import tempfile
from pathlib import Path
from typing import Callable, Literal

from importers.excel.parser import parse_estimate_excel
from importers.lx import parse_lx_return_excel
from importers.mx import parse_mx_return_excel
from importers.normalize import normalize_estimate
from importers.six.parser import SixParser
from importers.types import NormalizedEstimate

ParserFn = Callable[..., NormalizedEstimate]
FormatHint = Literal["six", "lx", "mx", "excel"]


def _with_tempfile(file_bytes: bytes, filename: str | None) -> Path:
    suffix = Path(filename or "").suffix
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix or ".tmp")
    tmp.write(file_bytes)
    tmp.flush()
    tmp.close()
    return Path(tmp.name)


def parse_six_estimate_from_bytes(
    *,
    file_bytes: bytes,
    filename: str | None = None,
) -> NormalizedEstimate:
    parser = SixParser(file_bytes)
    parsed = parser.parse()
    price_catalog = parser.export_price_catalog()
    return normalize_estimate(
        parsed,
        format="six",
        source="six",
        price_catalog=price_catalog,
        raw={"preventivi": parser.preventivi, "last_preventivo_id": parser.last_preventivo_id},
    )


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
