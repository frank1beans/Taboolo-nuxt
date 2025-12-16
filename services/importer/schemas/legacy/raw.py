from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal

__all__ = [
    "RawUnit",
    "RawGroupValue",
    "RawPriceList",
    "RawProduct",
    "RawMeasurement",
    "RawRilevazione",
    "RawPreventivoMetadata",
    "RawLxItem",
    "RawMxReturn",
]


@dataclass
class RawUnit:
    """Unità di misura letta direttamente dal file senza normalizzazione."""

    unit_id: str
    label: str


@dataclass
class RawGroupValue:
    """Valore di gruppo <grpValore> con informazioni WBS o spaziali così come trovate nell'XML."""

    grp_id: str
    code: str | None = None
    description: str | None = None
    kind: str = "other"  # spatial | wbs6 | wbs7 | other
    level: int | None = None


@dataclass
class RawPriceList:
    """Identificativo e metadati di una lista prezzi prima di qualsiasi normalizzazione."""

    list_id_raw: str
    canonical_id: str = ""
    label: str | None = None
    priority: int = 0
    preferred: bool = False

    def __post_init__(self) -> None:
        if not self.canonical_id:
            self.canonical_id = self.list_id_raw


@dataclass
class RawProduct:
    """Prodotto/voce estratto dal prezzario senza arricchimenti o aggregazione."""

    prodotto_id: str
    code: str | None = None
    desc_short: str = ""
    desc_long: str | None = None
    unit_id: str | None = None
    wbs6_code: str | None = None
    wbs6_description: str | None = None
    wbs7_code: str | None = None
    wbs7_description: str | None = None
    is_parent_voice: bool = False
    prices: list[tuple[str, float, int]] = field(default_factory=list)

    def __post_init__(self) -> None:
        if not self.desc_short:
            self.desc_short = self.code or self.prodotto_id


@dataclass
class RawMeasurement:
    """Singola misura grezza con celle valutate e riferimenti ancora da risolvere."""

    operation: str = "+"
    cells: list[tuple[int, str, Decimal | None]] = field(default_factory=list)
    product: Decimal | None = None
    references: list[int] = field(default_factory=list)

    def __post_init__(self) -> None:
        if not self.operation:
            self.operation = "+"


@dataclass
class RawRilevazione:
    """Rilevazione del preventivo con misure, riferimenti e contesto WBS non normalizzato."""

    idx: int
    prodotto_id: str
    progressivo: int | None = None
    lista_quotazione_id_raw: str | None = None
    wbs_spatial: list[RawGroupValue] = field(default_factory=list)
    misure: list[RawMeasurement] = field(default_factory=list)
    comments: list[str] = field(default_factory=list)
    quantity_direct: Decimal | None = None
    reference_entries: list[tuple[int, Decimal]] = field(default_factory=list)
    quantity_total_resolved: Decimal | None = None


@dataclass
class RawPreventivoMetadata:
    """Metadati generali del preventivo così come riportati nel file sorgente."""

    preventivo_id: str
    code: str | None = None
    description: str | None = None
    date: str | None = None
    price_list_id_raw: str | None = None
    rilevazioni: int = 0
    items: int = 0
    total_importo_preview: float | None = None
    linked_return_id: str | None = None


@dataclass
class RawLxItem:
    """Riga di ritorno LX con quantità consuntivate e token descrittivi."""

    code: str
    description: str | None
    price: float | None
    quantity: float | None
    tokens: list[str] | None = None
    list_id: str | None = None
    product_id: str | None = None


@dataclass
class RawMxReturn:
    """Riga di ritorno MX per progressivo con prezzo e quantità aggiornati."""

    progressive: int
    code: str
    description: str | None
    price: float | None
    quantity: float | None
    tokens: list[str] | None = None
    product_id: str | None = None
    rilevazione_id: str | None = None
