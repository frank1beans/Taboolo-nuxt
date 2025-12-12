from pathlib import Path
from typing import Sequence

from importers.helpers.text_and_measure import head_to_tail_quantity, tokenize_description
from importers.parser_utils import _CustomReturnParseResult, parse_custom_return_excel


def parse_mx_return_excel(
    file_path: Path,
    sheet_name: str | None,
    code_columns: Sequence[str],
    description_columns: Sequence[str],
    price_column: str,
    quantity_column: str | None = None,
    progressive_column: str | None = None,
) -> _CustomReturnParseResult:
    """MX parser: same logic as LX but combines totals (combine_totals=True)."""
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
