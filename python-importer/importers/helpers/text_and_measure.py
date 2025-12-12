from __future__ import annotations

from decimal import Decimal
import re
import unicodedata
from typing import Any, Iterable, List, Optional, Tuple


def head_to_tail_quantity(
    rows: List[Tuple[Any, ...]],
    start_index: int,
    qty_col: int = 1,
    price_col: int = 0,
) -> Optional[float]:
    """
    Somma le quantità delle righe successive a start_index finché la colonna prezzo è vuota.
    I parametri qty_col e price_col indicano gli indici (0-based) delle colonne quantità e prezzo.
    Restituisce None se non trova righe valide.

    Esempi:
        >>> rows = [(None, None), ('', 2.0), ('', 3.0), (5.0, None)]
        >>> head_to_tail_quantity(rows, 0)  # somma 2.0 + 3.0
        5.0
        >>> head_to_tail_quantity(rows, 2)  # interrompe su prezzo valorizzato
        None
    """
    total: float | None = None
    for row in rows[start_index + 1 :]:
        price = row[price_col] if price_col < len(row) else None
        qty = row[qty_col] if qty_col < len(row) else None
        # interrompe se la cella prezzo è valorizzata (stringa o numero non vuoto)
        if price not in (None, "", " "):
            if isinstance(price, (int, float, Decimal)):
                break
            # se è stringa non vuota, interrompe
            if isinstance(price, str) and price.strip():
                break
        if qty is not None and price in (None, "", " "):
            total = (total or 0.0) + float(qty)
        else:
            break
    return total


def tokenize_description(text: str) -> List[str]:
    """
    Pulisce e suddivide la descrizione in token unici:
    - converte in minuscolo e applica unicodedata.normalize('NFKD')
    - rimuove accenti e punteggiatura con re.sub('[^\\w\\s]', '')
    - divide su spazi, elimina stopword italiane di base (di, e, con, per, ecc.) e token solo numerici
    - restituisce la lista di token unici nell'ordine di apparizione.

    Esempi:
        >>> tokenize_description('Ponteggio in acciaio, per edilizia.')
        ['ponteggio', 'acciaio', 'edilizia']
        >>> tokenize_description('Scavo di fondazione h=1.5 m, con mezzi meccanici')
        ['scavo', 'fondazione', 'h', 'm', 'mezzi', 'meccanici']
    """
    text_norm = unicodedata.normalize("NFKD", text or "").encode("ASCII", "ignore").decode("ASCII")
    cleaned = re.sub(r"[^\w\s]", " ", text_norm.lower())
    tokens: list[str] = []
    seen: set[str] = set()
    stopwords = {"di", "e", "con", "per", "in", "a", "da", "il", "la", "le", "del", "delle"}
    for word in cleaned.split():
        if not word:
            continue
        if word in stopwords:
            continue
        if word.isdigit():
            continue
        if word not in seen:
            tokens.append(word)
            seen.add(word)
    return tokens
