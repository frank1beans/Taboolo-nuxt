from __future__ import annotations

import re
from decimal import Decimal
from typing import Iterable

from importers.models.raw import (
    RawGroupValue,
    RawMeasurement,
    RawPriceList,
    RawProduct,
    RawRilevazione,
)

__all__ = [
    "canonicalizza_price_lists",
    "build_wbs_path",
    "compute_quantity_direct",
    "resolve_progressivo_quantities",
]

_PRICE_LIST_KEY_PATTERN = re.compile(r"[^a-z0-9]+")
_ZERO_EPSILON = Decimal("1e-12")
_PREFERRED_TOKENS = ("progetto", "default")


def canonicalizza_price_lists(price_lists: list[RawPriceList]) -> dict[str, str]:
    """
    Canonicalizza alias e priorità delle liste prezzi.

    Args:
        price_lists: collezione di RawPriceList estratte dal file.
    Returns:
        Mappa alias -> canonical_id calcolata su nomi e label fornite.

    Esempio:
        >>> lists = [RawPriceList(list_id_raw="Prezzi Base", label="Prezzi Base")]
        >>> canonicalizza_price_lists(lists)
        {'Prezzi Base': 'prezzi_base', 'prezzi_base': 'prezzi_base'}
    """
    alias_map: dict[str, str] = {}
    for price_list in price_lists:
        canonical_id = _canonicalize_price_list_id(price_list.label, price_list.list_id_raw)
        priority = _determine_price_list_priority(price_list.label, price_list.list_id_raw)
        preferred = _is_preferred_price_list(price_list.label, price_list.list_id_raw, canonical_id)
        price_list.canonical_id = canonical_id
        price_list.priority = priority
        price_list.preferred = preferred
        for alias in _iter_aliases(price_list, canonical_id):
            alias_map[alias] = canonical_id
    return alias_map


def build_wbs_path(
    rilevazione: RawRilevazione,
    product: RawProduct,
) -> list[tuple[int, str, str | None]]:
    """
    Costruisce il percorso WBS combinando livelli spaziali e codici WBS6/7.

    Args:
        rilevazione: rilevazione con livelli spaziali 1-5.
        product: prodotto con eventuali codici WBS6/7.
    Returns:
        Lista ordinata di tuple (level, code, description).

    Esempio:
        >>> path = build_wbs_path(rilevazione, product)
        >>> path[0]
        (1, 'A01', 'Blocco A')
    """
    levels: dict[int, tuple[int, str, str | None]] = {}
    for grp in rilevazione.wbs_spatial:
        if grp.kind != "spatial" or not grp.level:
            continue
        levels[grp.level] = (grp.level, grp.code or "", grp.description)

    if product.wbs6_code:
        levels[6] = (6, product.wbs6_code, product.wbs6_description or product.wbs6_code)
    else:
        levels[6] = _fallback_wbs6(product, rilevazione)

    if product.wbs7_code:
        levels[7] = (7, product.wbs7_code, product.wbs7_description or product.wbs7_code)

    return [levels[level] for level in sorted(levels.keys())]


def compute_quantity_direct(measures: list[RawMeasurement]) -> Decimal | None:
    """
    Somma la quantità diretta ignorando misure che dipendono da altri progressivi.

    Args:
        measures: elenco di RawMeasurement già valutate (product valorizzato).
    Returns:
        Somma delle misure con segno; None se trascurabile.

    Esempio:
        >>> compute_quantity_direct([RawMeasurement(product=Decimal("5")), RawMeasurement(product=Decimal("0.05"))])
        Decimal('5.05')
    """
    total = Decimal("0")
    current_sign = Decimal(1)
    for measure in measures:
        if measure.references:
            continue
        operation = (measure.operation or "").strip()
        if operation == "-":
            current_sign = Decimal(-1)
        elif operation == "+":
            current_sign = Decimal(1)
        if measure.product is None:
            continue
        total += current_sign * _to_decimal(measure.product)
    return total if abs(total) > _ZERO_EPSILON else None


def resolve_progressivo_quantities(rilevazioni: list[RawRilevazione]) -> None:
    """
    Risolve le quantità per progressivo includendo riferimenti ricorsivi.

    Args:
        rilevazioni: lista di RawRilevazione con quantity_direct e reference_entries.
    Returns:
        None. Aggiorna in place quantity_total_resolved su ogni elemento.

    Esempio:
        >>> resolve_progressivo_quantities(rilevazioni)
        >>> rilevazioni[1].quantity_total_resolved
        Decimal('3')
    """
    direct_quantities: dict[int, Decimal] = {}
    references: dict[int, list[tuple[int, Decimal]]] = {}

    for rilevazione in rilevazioni:
        if rilevazione.quantity_direct is None and rilevazione.misure:
            rilevazione.quantity_direct = compute_quantity_direct(rilevazione.misure)
        if rilevazione.progressivo is None:
            continue
        direct_quantities[rilevazione.progressivo] = _to_decimal(
            rilevazione.quantity_direct or Decimal("0")
        )
        if rilevazione.reference_entries:
            references[rilevazione.progressivo] = [
                (ref_prog, _to_decimal(factor)) for ref_prog, factor in rilevazione.reference_entries
            ]

    resolved_cache: dict[int, Decimal | None] = {}

    def _resolve(prog: int, stack: set[int]) -> Decimal | None:
        if prog in resolved_cache:
            return resolved_cache[prog]
        if prog in stack:
            raise ValueError(f"Riferimento circolare tra progressivi: {prog} -> {sorted(stack)}")
        stack.add(prog)
        total = direct_quantities.get(prog, Decimal("0"))
        for ref_prog, factor in references.get(prog, []):
            ref_value = _resolve(ref_prog, stack)
            if ref_value is None:
                continue
            total += factor * ref_value
        stack.remove(prog)
        resolved_value = total if abs(total) > _ZERO_EPSILON else None
        resolved_cache[prog] = resolved_value
        return resolved_value

    for rilevazione in rilevazioni:
        if rilevazione.progressivo is None:
            direct = rilevazione.quantity_direct
            rilevazione.quantity_total_resolved = direct if direct and abs(direct) > _ZERO_EPSILON else None
            continue
        rilevazione.quantity_total_resolved = _resolve(rilevazione.progressivo, set())


def _canonicalize_price_list_id(label: str | None, fallback: str | None = None) -> str:
    label_norm = _normalize_price_list_token(label)
    fallback_norm = _normalize_price_list_token(fallback)
    if _is_prezzi_base_label(label_norm) or _is_prezzi_base_label(fallback_norm):
        return "prezzi_base"
    if _is_plain_base_label(label_norm) or _is_plain_base_label(fallback_norm):
        return "prezzi_base"

    candidates: list[str] = []
    if label:
        candidates.append(label)
    if fallback and fallback not in candidates:
        candidates.append(fallback)
    for candidate in candidates:
        normalized = _PRICE_LIST_KEY_PATTERN.sub("_", candidate.strip().lower()).strip("_")
        if normalized:
            return normalized
    if fallback:
        normalized = _PRICE_LIST_KEY_PATTERN.sub("_", fallback.strip().lower()).strip("_")
        if normalized:
            return normalized
    return "listino"


def _determine_price_list_priority(label: str | None, fallback: str | None) -> int:
    label_norm = _normalize_price_list_token(label)
    fallback_norm = _normalize_price_list_token(fallback)
    if _is_prezzi_base_label(label_norm) or _is_prezzi_base_label(fallback_norm):
        return 2
    if _is_plain_base_label(label_norm) or _is_plain_base_label(fallback_norm):
        return 1
    return 0


def _normalize_price_list_token(value: str | None) -> str:
    return (value or "").strip().lower()


def _is_prezzi_base_label(normalized_value: str) -> bool:
    return bool(normalized_value) and "prezzi" in normalized_value and "base" in normalized_value


def _is_plain_base_label(normalized_value: str) -> bool:
    return bool(normalized_value) and normalized_value == "base"


def _is_preferred_price_list(*values: str | None) -> bool:
    for value in values:
        norm = _normalize_price_list_token(value)
        if any(token in norm for token in _PREFERRED_TOKENS):
            return True
    return False


def _iter_aliases(price_list: RawPriceList, canonical_id: str) -> Iterable[str]:
    seen: set[str] = set()
    for candidate in (price_list.list_id_raw, price_list.label, canonical_id):
        if not candidate:
            continue
        alias = candidate.strip()
        if not alias or alias in seen:
            continue
        seen.add(alias)
        yield alias


def _fallback_wbs6(product: RawProduct, rilevazione: RawRilevazione) -> tuple[int, str, str | None]:
    base = (
        product.wbs6_code
        or product.code
        or product.prodotto_id
        or (f"PROG-{rilevazione.progressivo}" if rilevazione.progressivo is not None else None)
        or "UNMAPPED"
    )
    code = re.sub(r"[^A-Za-z0-9]", "", base).upper() or "UNMAPPED"
    description = product.wbs6_description or product.desc_short or product.desc_long or product.code or code
    return (6, code, description)


def _to_decimal(value: Decimal | float | int) -> Decimal:
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))
