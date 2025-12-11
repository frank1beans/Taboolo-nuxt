from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class SixImportReportSchema(BaseModel):
    commessa_id: str
    project_id: str | None = None  # alias
    wbs_spaziali: int
    spatial_wbs: int | None = None  # alias
    wbs6: int
    wbs7: int
    voci: int
    importo_totale: float
    total_amount: float | None = None  # alias
    price_items: Optional[int] = None
    preventivo_id: Optional[str] = None
    estimate_id: Optional[str] = None  # alias
    voci_stats: Optional[dict[str, int]] = None
    listino_only: bool = False
    catalog_only: bool = False
    # Payload esteso per Nitro (non richiesto dal frontend legacy)
    price_catalog: Optional[list[dict]] = None
    items: Optional[list[dict]] = None
    wbs_spaziali_nodes: Optional[list[dict]] = None
    wbs6_nodes: Optional[list[dict]] = None
    wbs7_nodes: Optional[list[dict]] = None


class SixPreventivoOptionSchema(BaseModel):
    internal_id: str
    code: Optional[str] = None
    description: Optional[str] = None
    author: Optional[str] = None
    version: Optional[str] = None
    date: Optional[str] = None
    price_list_id: Optional[str] = None
    price_list_label: Optional[str] = None
    rilevazioni: Optional[int] = None
    items: Optional[int] = None
    total_importo: Optional[float] = None


class SixPreventiviPreviewSchema(BaseModel):
    preventivi: list[SixPreventivoOptionSchema]


class SixInspectionPriceListSchema(BaseModel):
    canonical_id: str
    label: str
    aliases: list[str] = []
    priority: int = 0
    products: int = 0
    rilevazioni: int = 0


class SixInspectionGroupSchema(BaseModel):
    grp_id: str
    code: str
    description: Optional[str] = None
    level: Optional[int] = None


class SixPreventivoInspectSchema(BaseModel):
    internal_id: str
    code: Optional[str] = None
    description: Optional[str] = None
    author: Optional[str] = None
    version: Optional[str] = None
    date: Optional[str] = None
    price_list_id: Optional[str] = None
    rilevazioni: int = 0
    items: int = 0
    price_list_label: Optional[str] = None
    total_importo: Optional[float] = None


class SixInspectionSchema(BaseModel):
    preventivi: list[SixPreventivoInspectSchema]
    price_lists: list[SixInspectionPriceListSchema]
    wbs_spaziali: list[SixInspectionGroupSchema]
    wbs6: list[SixInspectionGroupSchema]
    wbs7: list[SixInspectionGroupSchema]
    products_total: int
