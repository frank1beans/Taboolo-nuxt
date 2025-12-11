from __future__ import annotations

import logging
from typing import Any

from importers.excel.types import ParsedItem
from importers.six.parser import (
    PreventivoOption,
    PreventivoSelectionError,
    SixParser,
    _load_xml_from_upload,
)

logger = logging.getLogger(__name__)


class SixImportService:
    """
    Stateless SIX/XML import wrapper that delegates parsing to `importers.six.parser`.
    """

    def __init__(self) -> None:
        self._parser_cls = SixParser

    def parse_only(
        self,
        *,
        file_bytes: bytes,
        filename: str | None = None,
        commessa_id: str | None = None,
        preventivo_id: str | None = None,
        compute_embeddings: bool = False,  # kept for interface compatibility
        extract_properties: bool = False,  # kept for interface compatibility
    ) -> dict[str, Any]:
        """
        Parse SIX/XML without touching any DB. Returns a report ready for Nitro/Mongo.
        """
        xml_bytes = _load_xml_from_upload(file_bytes, filename)
        parser = self._parser_cls(xml_bytes)

        structure = parser.inspect_structure()
        wbs_spaziali_nodes = structure.get("wbs_spaziali") or []
        wbs6_nodes = structure.get("wbs6") or []
        wbs7_nodes = structure.get("wbs7") or []

        base_report: dict[str, Any] = {
            "commessa_id": commessa_id,
            "project_id": commessa_id,  # alias for Nuxt consistency
            "file_name": filename,
            "wbs_spaziali": len(wbs_spaziali_nodes),
            "wbs6": len(wbs6_nodes),
            "wbs7": len(wbs7_nodes),
            "spatial_wbs": len(wbs_spaziali_nodes),  # alias
            "wbs_spaziali_nodes": wbs_spaziali_nodes,
            "wbs6_nodes": wbs6_nodes,
            "wbs7_nodes": wbs7_nodes,
            "listino_only": True,
            "catalog_only": True,  # alias
            "preventivo_id": None,
            "estimate_id": None,  # alias
            "importo_totale": 0.0,
            "total_amount": 0.0,  # alias
            "price_items": 0,
            "voci": 0,
            "items": [],
            "voci_stats": {},
        }

        has_preventivi = bool(parser.preventivi)
        parsed_computo = None
        if has_preventivi:
            parsed_computo = parser.parse(preventivo_id=preventivo_id)
            opt_id = parser.last_preventivo_id or preventivo_id
            option = parser.preventivi.get(opt_id) if opt_id else None
            if option:
                base_report["preventivo_meta"] = {
                    "id": option.internal_id,
                    "code": option.code,
                    "description": option.description,
                    "author": option.author,
                    "version": option.version,
                    "date": option.date,
                    "price_list_id": option.price_list_id,
                    "price_list_label": option.price_list_label,
                }
            elif opt_id:
                base_report["preventivo_meta"] = {"id": opt_id}

        price_catalog = parser.export_price_catalog()
        base_report["price_items"] = len(price_catalog)
        base_report["price_catalog"] = price_catalog

        if parsed_computo:
            base_report.update(
                {
                    "listino_only": False,
                    "catalog_only": False,
                    "preventivo_id": parser.last_preventivo_id or preventivo_id,
                    "estimate_id": parser.last_preventivo_id or preventivo_id,
                    "importo_totale": parsed_computo.total_amount or 0.0,
                    "total_amount": parsed_computo.total_amount or 0.0,
                    "voci": len(parsed_computo.items),
                    "items": [self._serialize_voce(voce) for voce in parsed_computo.items],
                    "voci_stats": parsed_computo.stats or {},
                }
            )

        return base_report

    @staticmethod
    def _serialize_voce(voce: ParsedItem) -> dict[str, Any]:
        return {
            "order": voce.order,
            "progressive": voce.progressive,
            "code": voce.code,
            "description": voce.description,
            "wbs_levels": [
                {"level": level.level, "code": level.code, "description": level.description}
                for level in voce.wbs_levels
            ],
            "unit": voce.unit,
            "quantity": voce.quantity,
            "unit_price": voce.unit_price,
            "amount": voce.amount,
            "notes": voce.notes,
            "metadata": voce.metadata or {},
        }

    def inspect_content(self, file_bytes: bytes, filename: str | None = None) -> list[PreventivoOption]:
        xml_bytes = _load_xml_from_upload(file_bytes, filename)
        parser = self._parser_cls(xml_bytes)
        return parser.list_preventivi()

    def inspect_details(self, file_bytes: bytes, filename: str | None = None) -> dict[str, Any]:
        """
        Explore SIX/XML content without importing anything. Returns a preview of preventivi,
        price lists, and WBS nodes to let the user inspect before importing.
        """
        xml_bytes = _load_xml_from_upload(file_bytes, filename)
        parser = self._parser_cls(xml_bytes)
        return parser.inspect_structure()


six_import_service = SixImportService()
