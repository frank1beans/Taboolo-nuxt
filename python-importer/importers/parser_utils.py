from __future__ import annotations

from importers.common import (
    _calculate_line_amount,
    _ceil_amount,
    _normalize_wbs7_code,
    _looks_like_wbs7_code,
)
from importers.excel.detector import (
    ColumnProfile as _ColumnProfile,
    ColumnSuggestion as _ColumnSuggestion,
    detect_column_suggestions as _detect_column_suggestions,
    columns_to_indexes as _columns_to_indexes,
    single_column_index as _single_column_index,
)
from importers.excel.parser import (
    parse_custom_return_excel,
    _parse_custom_return_excel,
)
from importers.excel.processor import (
    drop_empty_columns as _drop_empty_columns,
    locate_header_row as _locate_header_row,
    row_has_values as _row_has_values,
    column_has_values as _column_has_values,
    combine_code as _combine_code,
    combine_text as _combine_text,
    cell_to_float as _cell_to_float,
    cell_to_progressive as _cell_to_progressive,
    apply_column_filter as _apply_column_filter,
    extract_wbs_levels as _extract_wbs_levels,
    sanitize_price_candidate as _sanitize_price_candidate,
    has_external_formula as _has_external_formula,
)
from importers.excel.reader import (
    select_sheet as _select_sheet,
)
from importers.excel.types import ParsedEstimate

# Narrow export kept for backward compatibility with old importers
_CustomReturnParseResult = ParsedEstimate

__all__ = [
    "parse_custom_return_excel",
    "_parse_custom_return_excel",
    "_select_sheet",
    "_drop_empty_columns",
    "_locate_header_row",
    "_detect_column_suggestions",
    "_columns_to_indexes",
    "_single_column_index",
    "_row_has_values",
    "_column_has_values",
    "_combine_code",
    "_combine_text",
    "_cell_to_float",
    "_cell_to_progressive",
    "_apply_column_filter",
    "_extract_wbs_levels",
    "_sanitize_price_candidate",
    "_has_external_formula",
    "_ColumnProfile",
    "_ColumnSuggestion",
    "_CustomReturnParseResult",
]
