from __future__ import annotations

import logging
from collections import defaultdict
from decimal import Decimal
from typing import Any
import xml.etree.ElementTree as ET

from importers.models.raw import (
    RawGroupValue,
    RawMeasurement,
    RawPreventivoMetadata,
    RawPriceList,
    RawProduct,
    RawRilevazione,
    RawUnit,
    RawLxItem,
    RawMxReturn,
)
from importers.six.parser import (
    PreventivoOption,
    SixParser,
    _load_xml_from_upload,
    _to_int,
)
from importers.registry import parse_lx_estimate_from_bytes, parse_mx_estimate_from_bytes
from importers.helpers.text_and_measure import tokenize_description
from normalizers import (
    canonicalizza_price_lists,
    compute_quantity_direct,
    resolve_progressivo_quantities,
)

logger = logging.getLogger(__name__)


class SixRawImportService:
    """
    Estrae dal file SIX/XML le entità grezze senza aggregazioni o rendering.

    Esempio:
        >>> service = SixRawImportService()
        >>> result = service.parse_raw(file_bytes=data, filename="commessa.six")
        >>> result["units"][0].unit_id
        'm'
        >>> len(result["rilevazioni"]["PRV-1"])
        10
    """

    def __init__(self) -> None:
        self._parser_cls = SixParser

    def parse_raw(
        self,
        *,
        file_bytes: bytes,
        filename: str | None = None,
        linked_return_id: str | None = None,
    ) -> dict[str, Any]:
        """
        Restituisce i dati grezzi (unità, liste prezzi, gruppi, prodotti, preventivi, rilevazioni)
        pronti per essere salvati su MongoDB. Per file di grandi dimensioni si può passare a
        uno streaming basato su `ET.iterparse` per limitare l'uso di memoria.
        """
        xml_bytes = _load_xml_from_upload(file_bytes, filename)
        parser = self._parser_cls(xml_bytes)

        units = [RawUnit(unit_id=uid, label=label) for uid, label in parser.units.items()]

        price_lists = self._build_price_lists(parser)
        canonicalizza_price_lists(price_lists)

        groups = [
            RawGroupValue(
                grp_id=meta.grp_id,
                code=meta.code,
                description=meta.description,
                kind=meta.kind,
                level=meta.level,
            )
            for meta in parser.group_values.values()
        ]

        products = [
            self._build_raw_product(entry)
            for entry in parser.products.values()
        ]

        preventivi_meta: list[RawPreventivoMetadata] = []
        rilevazioni_by_preventivo: dict[str, list[RawRilevazione]] = defaultdict(list)

        for preventivo_id, option in parser.preventivi.items():
            preventivo_node = parser._preventivo_nodes.get(preventivo_id)  # noqa: SLF001
            preventivi_meta.append(
                RawPreventivoMetadata(
                    preventivo_id=option.internal_id,
                    code=option.code,
                    description=option.description,
                    date=option.date,
                    price_list_id_raw=option.price_list_id,
                    rilevazioni=option.rilevazioni,
                    items=option.items,
                    total_importo_preview=option.total_importo,
                    linked_return_id=linked_return_id,
                )
            )
            if preventivo_node is None:
                continue

            for idx, rilevazione in enumerate(
                preventivo_node.findall(f"{parser.ns}prvRilevazione"),
                start=1,
            ):
                raw_ril = self._build_raw_rilevazione(parser, rilevazione, idx, preventivo_id)
                raw_ril.quantity_direct = compute_quantity_direct(raw_ril.misure)
                rilevazioni_by_preventivo[preventivo_id].append(raw_ril)

        all_rilevazioni: list[RawRilevazione] = [
            ril for ril_list in rilevazioni_by_preventivo.values() for ril in ril_list
        ]
        resolve_progressivo_quantities(all_rilevazioni)

        return {
            "units": units,
            "price_lists": price_lists,
            "groups": groups,
            "products": products,
            "preventivi": preventivi_meta,
            "rilevazioni": rilevazioni_by_preventivo,
        }

    def inspect_raw_structure(
        self, file_bytes: bytes, filename: str | None = None
    ) -> dict[str, Any]:
        """
        Fornisce una preview minimale: counts di unità, prodotti, liste prezzi, gruppi e preventivi.
        Non esegue aggregazioni né arricchimenti.
        """
        xml_bytes = _load_xml_from_upload(file_bytes, filename)
        parser = self._parser_cls(xml_bytes)
        structure = parser.inspect_structure()
        return {
            "preventivi": structure.get("preventivi", []),
            "price_lists": structure.get("price_lists", []),
            "wbs_spaziali": structure.get("wbs_spaziali", []),
            "wbs6": structure.get("wbs6", []),
            "wbs7": structure.get("wbs7", []),
            "units_count": len(parser.units),
            "products_count": len(parser.products),
            "price_lists_count": len(parser.price_lists),
            "groups_count": len(parser.group_values),
        }

    def _build_price_lists(self, parser: SixParser) -> list[RawPriceList]:
        price_lists: list[RawPriceList] = []
        seen: set[str] = set()

        for raw_id, canonical in parser._price_list_aliases.items():  # noqa: SLF001
            if raw_id in seen:
                continue
            seen.add(raw_id)
            label = parser.price_lists.get(canonical, raw_id)
            priority = parser._price_list_alias_priorities.get(raw_id, 0)  # noqa: SLF001
            preferred = canonical in parser.preferred_price_lists
            price_lists.append(
                RawPriceList(
                    list_id_raw=raw_id,
                    canonical_id=canonical,
                    label=label,
                    priority=priority,
                    preferred=preferred,
                )
            )

        for canonical, label in parser.price_lists.items():
            if canonical in seen:
                continue
            preferred = canonical in parser.preferred_price_lists
            price_lists.append(
                RawPriceList(
                    list_id_raw=canonical,
                    canonical_id=canonical,
                    label=label,
                    priority=0,
                    preferred=preferred,
                )
            )
        return price_lists

    @staticmethod
    def _build_raw_product(entry: Any) -> RawProduct:
        prices: list[tuple[str, float, int]] = []
        for list_id, value in entry.price_by_list.items():
            priority = entry.price_priorities.get(list_id, 0)
            prices.append((list_id, value, priority))

        return RawProduct(
            prodotto_id=entry.prodotto_id,
            code=entry.code,
            desc_short=entry.description,
            desc_long=None,
            unit_id=entry.unit_id,
            wbs6_code=entry.wbs6_code,
            wbs6_description=entry.wbs6_description,
            wbs7_code=entry.wbs7_code,
            wbs7_description=entry.wbs7_description,
            is_parent_voice=entry.is_parent_voice,
            prices=prices,
        )

    def _build_raw_rilevazione(
        self,
        parser: SixParser,
        rilevazione: ET.Element,
        idx: int,
        preventivo_id: str,
    ) -> RawRilevazione:
        prodotto_id = rilevazione.attrib.get("prodottoId") or ""
        progressivo = _to_int(rilevazione.attrib.get("progressivo"))
        lista_quotazione_id_raw = rilevazione.attrib.get("listaQuotazioneId")

        wbs_spatial: list[RawGroupValue] = []
        for grp in rilevazione.findall(f"{parser.ns}prvGrpValore"):
            grp_id = grp.attrib.get("grpValoreId")
            if not grp_id:
                continue
            meta = parser.group_values.get(grp_id)
            if not meta or meta.kind != "spatial" or not meta.level or meta.level > 5:
                continue
            wbs_spatial.append(
                RawGroupValue(
                    grp_id=meta.grp_id,
                    code=meta.code,
                    description=meta.description,
                    kind=meta.kind,
                    level=meta.level,
                )
            )

        misure: list[RawMeasurement] = []
        for misura in rilevazione.findall(f"{parser.ns}prvMisura"):
            misure.append(self._parse_raw_misura(parser, misura))

        comments = parser._collect_comments(rilevazione)  # noqa: SLF001
        reference_entries = [
            (ref_prog, factor)
            for (pid, ref_prog), factor in parser._collect_reference_entries(  # noqa: SLF001
                rilevazione, preventivo_id
            )
            if pid == preventivo_id
        ]

        return RawRilevazione(
            idx=idx,
            prodotto_id=prodotto_id,
            progressivo=progressivo,
            lista_quotazione_id_raw=lista_quotazione_id_raw,
            wbs_spatial=wbs_spatial,
            misure=misure,
            comments=comments,
            quantity_direct=None,
            reference_entries=reference_entries,
            quantity_total_resolved=None,
        )

    def _parse_raw_misura(self, parser: SixParser, misura: ET.Element) -> RawMeasurement:
        operation = (misura.attrib.get("operazione") or "").strip()
        cells: list[tuple[int, str, Decimal | None]] = []
        for cella in misura.findall(f"{parser.ns}prvCella"):
            raw_text = cella.attrib.get("testo")
            value = parser._parse_numeric_value(raw_text)  # noqa: SLF001
            pos_label = cella.attrib.get("posizione") or "0"
            try:
                position = int(pos_label)
            except ValueError:
                position = 0
            cells.append((position, raw_text or "", value))

        context = parser._parse_misura_context(misura)  # noqa: SLF001
        return RawMeasurement(
            operation=operation,
            cells=cells,
            product=context.product,
            references=context.references,
        )

    def inspect_content(self, file_bytes: bytes, filename: str | None = None) -> list[PreventivoOption]:
        """
        Alias per compatibilità con SixImportService: elenca i preventivi disponibili.
        """
        xml_bytes = _load_xml_from_upload(file_bytes, filename)
        parser = self._parser_cls(xml_bytes)
        return parser.list_preventivi()

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
