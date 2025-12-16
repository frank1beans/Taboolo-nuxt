from __future__ import annotations

import logging
from typing import Any, Sequence

from schemas.legacy.raw import (
    RawLxItem,
    RawMxReturn,
    RawProduct,
    RawRilevazione,
)
from registry import parse_lx_estimate_from_bytes, parse_mx_estimate_from_bytes
from parsers.helpers.text_and_measure import tokenize_description

logger = logging.getLogger(__name__)


class SixRawImportService:
    """
    Servizio per importazione raw da file excel (Ritorni).
    Logica SIX raw migrata su domain.py (Nuovo Parser).
    """

    def __init__(self) -> None:
        pass

    def parse_lx_raw(
        self,
        file_bytes: bytes,
        filename: str | None,
        sheet_name: str | None,
        code_columns: Sequence[str] | None,
        description_columns: Sequence[str] | None,
        price_column: str,
        quantity_column: str | None = None,
    ) -> list[RawLxItem]:
        """
        Legge un file LX e restituisce una lista di RawLxItem senza calcolare importi o WBS.
        """
        estimate = parse_lx_estimate_from_bytes(
            file_bytes=file_bytes,
            filename=filename,
            sheet_name=sheet_name,
            code_columns=code_columns,
            description_columns=description_columns,
            price_column=price_column,
            quantity_column=quantity_column,
        )
        items: list[RawLxItem] = []
        for item in estimate.items:
            tokens = tokenize_description(item.description or "") if item.description else []
            items.append(
                RawLxItem(
                    code=item.code or "",
                    description=item.description,
                    price=item.unit_price,
                    quantity=item.quantity,
                    tokens=tokens,
                )
            )
        return items

    def parse_mx_raw(
        self,
        file_bytes: bytes,
        filename: str | None,
        sheet_name: str | None,
        code_columns: Sequence[str] | None,
        description_columns: Sequence[str] | None,
        price_column: str,
        quantity_column: str | None = None,
        progressive_column: str | None = None,
    ) -> list[RawMxReturn]:
        """
        Legge un file MX e restituisce una lista di RawMxReturn senza calcolare importi o WBS.
        """
        estimate = parse_mx_estimate_from_bytes(
            file_bytes=file_bytes,
            filename=filename,
            sheet_name=sheet_name,
            code_columns=code_columns,
            description_columns=description_columns,
            price_column=price_column,
            quantity_column=quantity_column,
            progressive_column=progressive_column,
        )
        returns: list[RawMxReturn] = []
        for item in estimate.items:
            tokens = tokenize_description(item.description or "") if item.description else []
            prog = item.progressive if item.progressive is not None else 0
            returns.append(
                RawMxReturn(
                    progressive=prog,
                    code=item.code or "",
                    description=item.description,
                    price=item.unit_price,
                    quantity=item.quantity,
                    tokens=tokens,
                )
            )
        return returns

    def match_returns_to_catalog(
        self,
        lx_items: list[RawLxItem],
        mx_returns: list[RawMxReturn],
        products: dict[str, RawProduct],
        rilevazioni: dict[tuple[str, int], RawRilevazione],
    ) -> None:
        """
        Collega LX/MX ai prodotti/rilevazioni noti basandosi su codice prodotto e progressivo.
        """
        code_to_product: dict[str, str] = {}
        for prod in products.values():
            if prod.code:
                code_to_product[prod.code.lower()] = prod.prodotto_id

        for item in lx_items:
            if item.product_id or not item.code:
                continue
            prod_id = code_to_product.get(item.code.lower())
            if prod_id:
                item.product_id = prod_id

        # build mapping for rilevazioni by (progressivo, prodotto_id)
        prog_map: dict[tuple[int, str], tuple[str, RawRilevazione]] = {}
        for key, ril in rilevazioni.items():
            preventivo_id, _ = key
            prog = ril.progressivo
            if prog is None or not ril.prodotto_id:
                continue
            prog_map[(prog, ril.prodotto_id)] = (preventivo_id, ril)

        for mx in mx_returns:
            prod_id = code_to_product.get(mx.code.lower()) if mx.code else None
            if prod_id:
                mx.product_id = prod_id
                match = prog_map.get((mx.progressive, prod_id))
                if match:
                    preventivo_id, ril = match
                    mx.rilevazione_id = f"{preventivo_id}:{ril.progressivo}"


six_raw_import_service = SixRawImportService()

