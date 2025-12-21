from __future__ import annotations

import logging
import re
import uuid
import xml.etree.ElementTree as ET
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Optional, Tuple, Set, Any

from core.interfaces import ParserProtocol
from domain import (
    NormalizedEstimate,
    PriceList,
    WbsNode,
    PriceListItem,
    Measurement,
    MeasurementDetail,
    PreventivoModel,
)

logger = logging.getLogger(__name__)

# Facoltativo: pattern riferimenti testuali (se in PriMus compaiono)
_REFERENCE_PATTERN = re.compile(
    r"(?:voce|rif\.?|riferimento|prog\.?|progressivo)\s*(?:n\.|nr\.?|num\.?)?\s*(\d+)|"
    r"#(\d+)|"
    r"[\'`]\s*(\d+)|"
    r"\[(\d+)\]|"
    r"<(\d+)>",
    re.IGNORECASE
)


class PrimusXpweParser(ParserProtocol):
    """
    Parser PriMus/XPWE -> modello normalizzato.
    Obiettivi:
    - multi-pass (definizioni -> voci/misure -> link)
    - preservare dettagli righe misura (RGItem)
    - usare ID XML come chiavi
    - niente mapping merceologico/spaziale qui (fase successiva)
    """

    def __init__(self) -> None:
        self.ns = ""
        self._price_list_items: Dict[str, PriceListItem] = {}
        self._wbs_nodes: Dict[str, WbsNode] = {}
        self._price_lists: Dict[str, PriceList] = {}

        # lookup rapidi per classificazioni PriMus
        self._cat_map: Dict[str, WbsNode] = {}
        self._cap_map: Dict[str, WbsNode] = {}

    # --------------------------
    # Public API
    # --------------------------
    def parse(self, file_content: bytes, filename: str | None = None) -> NormalizedEstimate:
        root = ET.fromstring(file_content)
        self.ns = self._detect_namespace(root)

        estimate = NormalizedEstimate()
        estimate.project_name = filename or "PriMus Import"

        # 1) Definizioni / dizionari
        self._parse_units(root, estimate)
        self._parse_wbs_like_definitions(root)   # categorie/capitoli (flat)
        self._parse_price_list_items(root)       # EPItem

        # 2) Voci computo + misure (VCItem + RGItem)
        preventivo = self._parse_computo_as_preventivo(root, code="PRIMUS", name=estimate.project_name)
        estimate.preventivi.append(preventivo)

        # 3) Post: link e filtri
        self._post_linking(estimate)

        # Export collections
        estimate.price_lists = list(self._price_lists.values())  # opzionale: se gestisci listini multipli
        estimate.wbs_nodes = list(self._wbs_nodes.values())
        estimate.price_list_items = list(self._price_list_items.values())

        return estimate

    # --------------------------
    # Namespace + helpers
    # --------------------------
    def _detect_namespace(self, root: ET.Element) -> str:
        if root.tag.startswith("{"):
            return root.tag.split("}")[0] + "}"
        return ""

    def _find(self, node: ET.Element, path: str) -> Optional[ET.Element]:
        return node.find(self._xp(path))

    def _findall(self, node: ET.Element, path: str) -> List[ET.Element]:
        return node.findall(self._xp(path))

    def _xp(self, path: str) -> str:
        """
        Converte "PweDocumento/PweElencoPrezzi/EPItem" in path con namespace.
        """
        if not self.ns:
            return ".//" + path
        parts = path.split("/")
        return ".//" + "/".join(f"{self.ns}{p}" for p in parts)

    def _text(self, node: Optional[ET.Element], default: str = "") -> str:
        if node is None or node.text is None:
            return default
        return node.text.strip()

    def _attr(self, node: Optional[ET.Element], key: str, default: str = "") -> str:
        if node is None:
            return default
        return (node.attrib.get(key) or default).strip()

    def _get(self, node: Optional[ET.Element], key: str, default: str = "") -> str:
        """
        Prova ad estrarre un attributo; se vuoto cerca un figlio <key>.
        """
        if node is None:
            return default
        val = (node.attrib.get(key) or "").strip()
        if val:
            return val
        child = node.find(self._xp(key))
        if child is not None and child.text:
            return child.text.strip()
        return default

    def _parse_float(self, val: str | None) -> Optional[float]:
        if val is None:
            return None
        s = val.strip()
        if not s:
            return None
        try:
            return float(s.replace(",", "."))
        except ValueError:
            return None

    def _round2(self, x: float) -> float:
        return float(Decimal(f"{x:.10f}").quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))

    # --------------------------
    # Pass 1: Units
    # --------------------------
    def _parse_units(self, root: ET.Element, estimate: NormalizedEstimate) -> None:
        """
        PriMus: l'unita' e' spesso un testo su EPItem/VCItem. Qui puoi anche fare "registry"
        per uniformare, ma senza forzare. Minimale: no-op o raccolta set.
        """
        # TODO (opzionale): normalize unit strings and store in estimate.units
        return

    # --------------------------
    # Pass 1: WBS-like (Categorie/Capitoli) - flat
    # --------------------------
    def _parse_wbs_like_definitions(self, root: ET.Element) -> None:
        """
        In XPWE tipicamente:
        - PweDGCapitoliCategorie contiene:
          - PweDGSuperCategorie / PweDGCategorie / PweDGSubCategorie
          - PweDGSuperCapitoli / PweDGCapitoli (e a volte sub)
        Creiamo WbsNode flat, con kind/level coerenti e id = ID numerico/stringa dell'XML.
        """
        dgc = self._find(root, "PweDGCapitoliCategorie")
        if dgc is None:
            logger.warning("PweDGCapitoliCategorie not found")
            return

        # --- CATEGORIE ---
        self._parse_wbs_block(
            dgc,
            block_path="PweDGSuperCategorie/DGSuperCategorieItem",
            kind="supercategoria",
            level=1,
            into_map=self._cat_map,
            id_attr="ID",
            code_attr="Codice",
            name_attr="DesSintetica",
        )
        self._parse_wbs_block(
            dgc,
            block_path="PweDGCategorie/DGCategorieItem",
            kind="categoria",
            level=2,
            into_map=self._cat_map,
            id_attr="ID",
            code_attr="Codice",
            name_attr="DesSintetica",
        )
        self._parse_wbs_block(
            dgc,
            block_path="PweDGSubCategorie/DGSubCategorieItem",
            kind="subcategoria",
            level=3,
            into_map=self._cat_map,
            id_attr="ID",
            code_attr="Codice",
            name_attr="DesSintetica",
        )

        # --- CAPITOLI ---
        self._parse_wbs_block(
            dgc,
            block_path="PweDGSuperCapitoli/DGSuperCapitoliItem",
            kind="supercapitolo",
            level=1,
            into_map=self._cap_map,
            id_attr="ID",
            code_attr="Codice",
            name_attr="DesSintetica",
        )
        self._parse_wbs_block(
            dgc,
            block_path="PweDGCapitoli/DGCapitoliItem",
            kind="capitolo",
            level=2,
            into_map=self._cap_map,
            id_attr="ID",
            code_attr="Codice",
            name_attr="DesSintetica",
        )
        # TODO: se esiste blocco subcapitoli nel tuo XPWE, aggiungerlo come level=3

    def _parse_wbs_block(
        self,
        base: ET.Element,
        block_path: str,
        kind: str,
        level: int,
        into_map: Dict[str, WbsNode],
        id_attr: str,
        code_attr: str,
        name_attr: str,
    ) -> None:
        for it in self._findall(base, block_path):
            raw_id = self._get(it, id_attr)
            if not raw_id:
                continue
            
            # NAMESPACED ID to prevent collisions (e.g. Cat "1" vs Cap "1")
            _id = f"{kind}_{raw_id}"
            
            code = self._get(it, code_attr, raw_id)
            name = self._get(it, name_attr, code)
            node = WbsNode(
                id=_id,
                code=code,
                name=name,
                level=level,
                type=kind,
            )
            self._wbs_nodes[_id] = node
            into_map[raw_id] = node # Keep raw ID in local map if needed (though we don't use it much)

    # --------------------------
    # Pass 1: Elenco Prezzi (EPItem -> PriceListItem)
    # --------------------------
    def _parse_price_list_items(self, root: ET.Element) -> None:
        for ep in self._findall(root, "PweElencoPrezzi/EPItem"):
            ep_id = self._attr(ep, "ID")
            if not ep_id:
                continue

            tariffa = self._get(ep, "Tariffa")
            articolo = self._get(ep, "Articolo")
            code = tariffa or articolo or ep_id

            desc = self._get(ep, "DesRidotta", code)
            desc_ext = self._get(ep, "DesEstesa", "")

            unit = self._get(ep, "UnMisura", "nr")

            # Prezzi: Prezzo1..Prezzo5 (mappa "lista" -> valore)
            prices: Dict[str, float] = {}
            for k in ("Prezzo1", "Prezzo2", "Prezzo3", "Prezzo4", "Prezzo5"):
                v = self._parse_float(self._get(ep, k))
                if v is not None:
                    prices[k] = v

            item = PriceListItem(
                id=ep_id,
                code=code,
                description=desc,
                long_description=desc_ext,
                unit=unit,
                price_by_list=prices,
            )

            # Link WBS-like dal prezzario (capitoli/categorie sugli EPItem)
            # (resta flat; non decidiamo merceologico/spaziale qui)
            self._attach_wbs_ids_from_epitem(ep, item)

            self._price_list_items[ep_id] = item

    def _attach_wbs_ids_from_epitem(self, ep: ET.Element, item: PriceListItem) -> None:
        """
        EPItem puo portare: IDSpCat/IDCat/IDSbCat e IDSpCap/IDCap/IDSbCap.
        Attacchiamo tali ID (namespaced) se esistono nel catalogo WBS nodes.
        """
        # Map XML key -> Kind (used as prefix)
        key_map = {
            "IDSpCat": "supercategoria",
            "IDCat": "categoria",
            "IDSbCat": "subcategoria",
            "IDSpCap": "supercapitolo",
            "IDCap": "capitolo",
            "IDSbCap": "subcapitolo",
        }
        
        for key, kind in key_map.items():
            raw_val = self._get(ep, key)
            if raw_val:
                namespaced_id = f"{kind}_{raw_val}"
                if namespaced_id in self._wbs_nodes and namespaced_id not in item.wbs_ids:
                    item.wbs_ids.append(namespaced_id)

    # --------------------------
    # Pass 2: Computo (VCItem + RGItem)
    # --------------------------
    def _parse_computo_as_preventivo(self, root: ET.Element, code: str, name: str) -> PreventivoModel:
        measurements: List[Measurement] = []

        # (opzionale) map per risoluzione riferimenti quantity, se nel tuo XPWE si usa
        raw_map: Dict[int, float] = {}
        ref_map: Dict[int, List[Tuple[int, float]]] = {}

        for idx, vc in enumerate(self._findall(root, "PweVociComputo/VCItem")):
            m, prog_num, refs = self._parse_vcitem(vc, idx)
            if m is None:
                continue
            measurements.append(m)

            if prog_num is not None:
                raw_map[prog_num] = m.total_quantity
                if refs:
                    ref_map[prog_num] = refs

        # TODO (facoltativo): se vuoi la risoluzione riferimenti stile SIX, applicala qui:
        # for m in measurements:
        #     if m.progressive:
        #         p = int(float(m.progressive))
        #         m.total_quantity = self._resolve_quantity(p, raw_map, ref_map, set())

        return PreventivoModel(
            id=str(uuid.uuid4()),
            code=code,
            name=name,
            measurements=measurements,
        )

    def _parse_vcitem(self, vc: ET.Element, index: int) -> Tuple[Optional[Measurement], Optional[int], List[Tuple[int, float]]]:
        """
        VCItem -> Measurement
        - product_id = IDEP (link a EPItem)
        - details = RGItem
        - total_quantity = somma righe (fallback a Quantita su VCItem)
        - wbs_node_ids = da IDCat/IDCap (se presenti) e/o dal prezzario linkato
        """
        vc_id = self._get(vc, "ID") or str(uuid.uuid4())
        idep = self._get(vc, "IDEP")  # link a EPItem

        # progressive: based on file order as requested by user (1-based index)
        # "l'ordinamento nel file xpwe deve essere risolto come progressivo, a presceindere dal VCItem ID"
        prog_num = index + 1

        # WBS ids dal VCItem (se esistono)
        wbs_ids: List[str] = []
        
        # Map XML key -> Kind (matches _attach_wbs_ids_from_epitem)
        key_map = {
            "IDSpCat": "supercategoria",
            "IDCat": "categoria",
            "IDSbCat": "subcategoria",
            "IDSpCap": "supercapitolo",
            "IDCap": "capitolo",
            "IDSbCap": "subcapitolo",
        }

        for key, kind in key_map.items():
            raw_val = self._get(vc, key)
            if raw_val:
                namespaced_id = f"{kind}_{raw_val}"
                if namespaced_id in self._wbs_nodes and namespaced_id not in wbs_ids:
                    wbs_ids.append(namespaced_id)
        
        # INFERENCE: Propagate WBS IDs found on VCItem (e.g. SubCategory) back to PriceListItem
        # Required because PriceListItems often lack explicit category links in XPWE
        if idep and idep in self._price_list_items:
            pl_item = self._price_list_items[idep]
            for wid in wbs_ids:
                if wid not in pl_item.wbs_ids:
                    pl_item.wbs_ids.append(wid)

        # Se non presenti sul VCItem, eredita dal PriceListItem (Forward inheritance)
        if idep and idep in self._price_list_items:
            for wid in self._price_list_items[idep].wbs_ids:
                if wid not in wbs_ids:
                    wbs_ids.append(wid)

        details: List[MeasurementDetail] = []
        total = Decimal(0)

        # Righe misura
        row_idx = 0
        for rg in self._findall(vc, "PweVCMisure/RGItem"):
            det, qty, refs = self._parse_rgitem(rg, row_idx)
            if det is not None:
                details.append(det)
                total += Decimal(str(qty))
                row_idx += 1

            # TODO: se implementi refs su descrizioni rg, accumula in una lista refs per voce

        # fallback su Quantita testata se non ci sono righe o somma = 0
        if row_idx == 0 or float(total) == 0.0:
            q_head = self._parse_float(self._get(vc, "Quantita"))
            if q_head is not None and q_head != 0:
                total = Decimal(str(q_head))

        # price list id: se nel tuo modello la usi, PriMus ha piu prezzi ma non sempre "lista"
        price_list_id = None  # TODO: decidi mapping (es. "Prezzo1" default)

        if idep and idep not in self._price_list_items:
            # crea stub
            self._price_list_items[idep] = PriceListItem(id=idep, code="UNK", description="Unknown", unit="nr")

        m = Measurement(
            id=vc_id,
            progressive=str(prog_num) if prog_num is not None else None,
            wbs_node_ids=wbs_ids,
            product_id=idep or "",
            related_item_id=None,          # TODO: se XPWE contiene "vedi voce", mappalo qui
            total_quantity=float(total),
            details=details,
            price_list_id=price_list_id,
        )

        # refs per risoluzione quantita: al momento none (dipende dai tuoi file)
        return m, prog_num, []

    def _parse_rgitem(self, rg: ET.Element, row_index: int) -> Tuple[Optional[MeasurementDetail], float, List[Tuple[int, float]]]:
        """
        RGItem -> MeasurementDetail
        Campi tipici:
        - PartiUguali, Lunghezza, Larghezza, HPeso
        - Quantita
        - Descrizione
        """
        parti = self._parse_float(self._get(rg, "PartiUguali"))
        lung = self._parse_float(self._get(rg, "Lunghezza"))
        larg = self._parse_float(self._get(rg, "Larghezza"))
        hpeso = self._parse_float(self._get(rg, "HPeso"))

        # quantita riga esplicita
        q = self._parse_float(self._get(rg, "Quantita"))
        if q is None:
            q = 0.0

        # descrizione riga (commento)
        desc = self._get(rg, "Descrizione", "")

        # formula solo descrittiva
        formula_parts: List[str] = []
        if parti is not None and parti != 1:
            formula_parts.append(str(parti))
        if lung is not None:
            formula_parts.append(str(lung))
        if larg is not None:
            formula_parts.append(str(larg))
        if hpeso is not None:
            formula_parts.append(str(hpeso))
        formula = " * ".join(formula_parts)

        det = MeasurementDetail(
            row_index=row_index,
            description=desc or None,
            formula=formula,
            quantity=q,
            length=lung,
            width=larg,
            height=hpeso,
            parts=parti,
        )

        # riferimenti testuali (se li usi)
        refs: List[Tuple[int, float]] = []
        # TODO: se nel tuo XPWE i riferimenti compaiono nella descrizione riga:
        # for ref in self._extract_references(desc):
        #     refs.append((ref, 1.0))

        return det, q, refs

    # --------------------------
    # Post processing
    # --------------------------
    def _post_linking(self, estimate: NormalizedEstimate) -> None:
        """
        - Propaga i WBS ID dalle misure ai prodotti (PriceListItem) usati.
        - Filtra solo nodi WBS effettivamente usati da misure o prodotti.
        """
        # Inference: Assegna ai prodotti i WBS in cui sono utilizzati
        # Questo serve perche' spesso EPItem non ha WBS, ma VCItem si.
        # Nella vista Listino vogliamo vedere il prodotto sotto i WBS in cui e' usato.
        product_wbs_map: Dict[str, Set[str]] = {}

        for p in estimate.preventivi:
            for m in p.measurements:
                if m.product_id and m.wbs_node_ids:
                    if m.product_id not in product_wbs_map:
                        product_wbs_map[m.product_id] = set()
                    product_wbs_map[m.product_id].update(m.wbs_node_ids)

        for prod_id, wbs_ids in product_wbs_map.items():
            if prod_id in self._price_list_items:
                item = self._price_list_items[prod_id]
                # Aggiungi solo quelli nuovi
                for wid in wbs_ids:
                    if wid not in item.wbs_ids:
                        item.wbs_ids.append(wid)

        # Filtra solo nodi WBS effettivamente usati da misure o prodotti
        used: Set[str] = set()

        for p in estimate.preventivi:
            for m in p.measurements:
                used.update(m.wbs_node_ids)
        
        for item in self._price_list_items.values():
            used.update(item.wbs_ids)

        self._wbs_nodes = {k: v for k, v in self._wbs_nodes.items() if k in used}

    # --------------------------
    # Optional: refs resolution (stile SIX)
    # --------------------------
    def _to_int(self, value: str | None) -> Optional[int]:
        if value is None:
            return None
        try:
            return int(float(value.strip()))
        except Exception:
            return None

    def _extract_references(self, text: str) -> List[int]:
        if not text:
            return []
        refs: List[int] = []
        matches = _REFERENCE_PATTERN.findall(text)
        for match in matches:
            for val in match:
                if val:
                    try:
                        refs.append(int(val))
                    except Exception:
                        pass
        return refs

    def _resolve_quantity(self, prog: int, raw_map: Dict[int, float], ref_map: Dict[int, List[Tuple[int, float]]], stack: Set[int]) -> float:
        if prog in stack:
            return 0.0
        stack.add(prog)

        total = raw_map.get(prog, 0.0)
        for ref_prog, mult in ref_map.get(prog, []):
            total += self._resolve_quantity(ref_prog, raw_map, ref_map, stack) * mult

        stack.remove(prog)
        return self._round2(total)
