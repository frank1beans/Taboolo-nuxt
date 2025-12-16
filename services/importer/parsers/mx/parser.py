"""MX return file parser."""
from pathlib import Path
from typing import Sequence

from parsers.shared.base_types import ParsedEstimate
from parsers.excel.parser import parse_custom_return_excel


def parse_mx_return_excel(
    file_path: Path,
    sheet_name: str | None,
    code_columns: Sequence[str],
    description_columns: Sequence[str],
    price_column: str,
    quantity_column: str | None = None,
    progressive_column: str | None = None,
) -> ParsedEstimate:
    """MX parser: same logic as custom return but combines totals."""
    return parse_custom_return_excel(
        file_path,
        sheet_name,
        code_columns,
        description_columns,
        price_column,
        quantity_column,
        progressive_column,
        combine_totals=True,
    )


__all__ = ["parse_mx_return_excel"]
