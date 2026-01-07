from __future__ import annotations

import logging
import uuid
import re
import xml.etree.ElementTree as ET
import re
from decimal import Decimal, ROUND_HALF_UP

# Reference pattern matching old_importer.py
# Captures: "voce n. 123", "#123", "→ 123", "[123]", "<123>"
_REFERENCE_PATTERN = re.compile(
    r"(?:voce|rif\.?|riferimento|prog\.?|progressivo)\s*(?:n\.|nr\.?|num\.?)?\s*(\d+)|"
    r"#(\d+)|"
    r"→\s*(\d+)|"
    r"\[(\d+)\]|"
    r"<(\d+)>",
    re.IGNORECASE
)

from typing import Dict, List, Optional, Tuple, Any, Set

from core.interfaces import ParserProtocol
from domain import (
    NormalizedEstimate,
    PriceList,
    WbsNode,
    PriceListItem,
    Measurement,
    MeasurementDetail,
    PreventivoModel
)

logger = logging.getLogger(__name__)

class SixParser(ParserProtocol):
    """
    Parses STR Vision SIX XML files into a normalized, relational format.
    Preserves raw formulas and avoids row aggregation.
    """
    
    def __init__(self) -> None:
        self.ns = ""
        self._price_list_items: Dict[str, PriceListItem] = {}
        self._wbs_nodes: Dict[str, WbsNode] = {}
        self._price_lists: Dict[str, PriceList] = {}
        
        # Helper map: grpValoreId -> WbsNode
        self._group_ref_map: Dict[str, WbsNode] = {} 

    def parse(self, file_content: bytes, filename: str | None = None) -> NormalizedEstimate:
        root = ET.fromstring(file_content)
        self.ns = self._detect_namespace(root)
        logger.debug(f"Root tag={root.tag}, Detected NS='{self.ns}'")
        
        # 1. Parse Definitions
        self._parse_price_lists(root)
        self._parse_groups_definitions(root)
        self._parse_products_definitions(root)
        
        estimate = NormalizedEstimate()
        estimate.project_name = filename or "SIX Import" # Fallback
        
        # 1b. Parse Units
        self._parse_units(root, estimate)
        
        # 2. Find All Preventivi
        preventivi_nodes = root.findall(f".//{self.ns}preventivo")
        logger.debug(f"Found {len(preventivi_nodes)} preventivi nodes using NS='{self.ns}'")
        
        if not preventivi_nodes:
            logger.warning("No preventivo found in SIX file, returning empty estimate")
            return estimate
            
        for prev_node in preventivi_nodes:
            # Check if valid (has id/code)
            prev_id = prev_node.attrib.get("preventivoId")
            if not prev_id: continue
            
            code = prev_node.attrib.get("prvId") or prev_id
            
            # Description
            desc_node = prev_node.find(f"{self.ns}prvDescrizione")
            desc = ""
            if desc_node is not None:
                desc = desc_node.attrib.get("breve") or desc_node.text or ""
                
            # Use first valid name as project name if missing
            if not estimate.project_name or estimate.project_name == "SIX Import":
                estimate.project_name = desc
                
            # 3. Parse Measurements for this preventivo
            measurements: List[Measurement] = []
            
            raw_map = {}
            ref_map = {}
            temp_items = []

            # Aggregation Map: Key = Progressive Code (or ID), Value = Measurement
            aggregated_map = {}
            
            # Iterate "prvRilevazione" inside this preventivo
            for i, node in enumerate(prev_node.findall(f"{self.ns}prvRilevazione")):
                res = self._parse_rilevazione(node, i)
                if res:
                    m, prog, refs = res
                    
                    # Key for aggregation: Progressive (Primary) or ID (Fallback)
                    key = m.progressive if m.progressive else m.id
                    
                    if key in aggregated_map:
                        # AGGREGATE with existing
                        existing = aggregated_map[key]
                        
                        # 1. Sum Quantity
                        existing.total_quantity += m.total_quantity
                        
                        # 2. Append Details
                        existing.details.extend(m.details)
                        
                        # 3. Merge WBS (Union)
                        for w in m.wbs_node_ids:
                            if w not in existing.wbs_node_ids:
                                existing.wbs_node_ids.append(w)
                                
                        # 4. Ref Map & Raw Map Accumulation
                        if prog is not None:
                             # Important: Accumulate raw quantity for resolution logic
                             current_raw = raw_map.get(prog, 0.0)
                             raw_map[prog] = current_raw + m.total_quantity
                             
                             if refs:
                                 if prog not in ref_map: ref_map[prog] = []
                                 ref_map[prog].extend(refs)
                                 
                    else:
                        # NEW Entry
                        aggregated_map[key] = m
                        temp_items.append(m)
                        
                        if prog is not None:
                            raw_map[prog] = m.total_quantity
                            if refs:
                                ref_map[prog] = refs
            
            logger.debug(f"First pass done. Raw map size: {len(raw_map)}. Ref map size: {len(ref_map)}")
            if ref_map:
                logger.debug(f"Ref map keys: {list(ref_map.keys())[:10]}")

            # Resolve Quantities
            logger.info("Resolving quantities...")
            for m in temp_items:
                if m.progressive:
                    try:
                        prog_int = int(float(m.progressive))
                        # Resolve!
                        final_qty = self._resolve_quantity(prog_int, raw_map, ref_map, set())
                        m.total_quantity = final_qty
                    except Exception as e:
                        logger.error(f"Error resolving qty for {m.progressive}: {e}")
                measurements.append(m)
            
            # Create Model
            p_model = PreventivoModel(
                id=prev_id,
                code=code,
                name=desc,
                measurements=measurements
            )
            estimate.preventivi.append(p_model)
        
        # 3. Post-Process: Reconstruct Hierarchy & Links
        # User requested to NOT infer parent_id explicitly.
        # self._reconstruct_hierarchy(estimate) 
        self._link_products_to_wbs(estimate)
        
        # FILTER: Keep only WBS nodes used in Measurements or Products
        used_wbs_ids = set()
        
        # 1. From Measurements
        for p in estimate.preventivi:
            for m in p.measurements:
                used_wbs_ids.update(m.wbs_node_ids)
                
        # 2. From Products
        for prod in self._price_list_items.values():
            used_wbs_ids.update(prod.wbs_ids)
            
        filtered_wbs_nodes = [n for n in self._wbs_nodes.values() if n.id in used_wbs_ids]
        logger.info(f"WBS Filtering: {len(self._wbs_nodes)} -> {len(filtered_wbs_nodes)} (Used nodes)")

        estimate.price_lists = list(self._price_lists.values())
        estimate.wbs_nodes = filtered_wbs_nodes
        estimate.price_list_items = list(self._price_list_items.values())
        
        return estimate

    def _parse_units(self, root: ET.Element, estimate: NormalizedEstimate):
        for udm in root.findall(f".//{self.ns}unitaDiMisura"):
            u_id = udm.attrib.get("unitaDiMisuraId")
            if not u_id: continue
            
            code = udm.attrib.get("codice") or u_id
            name = u_id
            
            # Try to get description
            desc_node = udm.find(f"{self.ns}udmDescrizione")
            if desc_node is not None:
                name = desc_node.attrib.get("breve") or desc_node.text or code
            
            estimate.units[u_id] = name
            
    def _detect_namespace(self, root: ET.Element) -> str:
        if root.tag.startswith("{"):
            return root.tag.split("}")[0] + "}"
        return ""

    def _parse_price_lists(self, root: ET.Element):
        # <defListini> <lstListino id="1" ...>
        # Logic simplified from legacy
        idx = 0
        pass # To be implemented if we need price list names

    def _parse_groups_definitions(self, root: ET.Element):
        """
        Parses <gruppo> and <grpValore> tags to build WBS nodes.
        """
        for gruppo in root.findall(f".//{self.ns}gruppo"):
            tipo = (gruppo.attrib.get("tipo") or "").strip()
            kind, level = self._classify_group(tipo)
            
            # We want to catch anything that looks like a WBS
            if kind == "other" and level == 99:
                 pass # Warning? Or just include as 'other'? Include for now.
                
            for valore in gruppo.findall(f"{self.ns}grpValore"):
                grp_id = valore.attrib.get("grpValoreId")
                if not grp_id: continue
                
                code = (valore.attrib.get("vlrId") or "").strip()
                desc_node = valore.find(f"{self.ns}vlrDescrizione")
                desc = ""
                if desc_node is not None:
                    desc = desc_node.attrib.get("breve") or desc_node.text or ""
                
                node = WbsNode(
                    id=grp_id,
                    code=code,
                    name=desc,
                    level=level,
                    type=kind
                )
                self._wbs_nodes[grp_id] = node
                self._group_ref_map[grp_id] = node

    def _classify_group(self, tipo: str) -> Tuple[str, int]:
        # User requested RAW extraction of kind, logic handling later.
        # We still try to extract level for the 'level' field.
        
        tipo_lower = tipo.lower()
        level = 99
        
        # Try to extract level number
        match = re.search(r"(?:wbs|livello)\s*0?(\d+)", tipo_lower)
        if match:
             level = int(match.group(1))
        elif "supercategorie" in tipo_lower: level = 1
        elif "categorie" in tipo_lower: level = 2
        
        # Return the raw string as kind (cleaned slightly of whitespace)
        return tipo.strip(), level

    def _parse_products_definitions(self, root: ET.Element):
        debug_count = 0
        
        # Track "voce" nodes (structural parents) with their extended descriptions
        # Key: prdId (code), Value: estesa description
        voce_descriptions: Dict[str, str] = {}
        
        for prodotto in root.findall(f".//{self.ns}prodotto"):
            prod_id = prodotto.attrib.get("prodottoId")
            if not prod_id: continue
            
            code = prodotto.attrib.get("prdId") or prod_id
            is_voce = prodotto.attrib.get("voce") == "true"
            
            # Description
            desc_node = prodotto.find(f"{self.ns}prdDescrizione")
            desc = ""
            desc_ext = ""
            if desc_node is not None:
                desc = desc_node.attrib.get("breve") or ""
                
                # Robust extraction for estesa (case-insensitive + text fallback)
                desc_ext = desc_node.attrib.get("estesa")
                if not desc_ext:
                    # Try case-insensitive lookup
                    for k, v in desc_node.attrib.items():
                        if k.lower().endswith("estesa"):
                            desc_ext = v
                            break
                            
                # Fallback to text if still empty (rare but possible)
                if not desc_ext and desc_node.text:
                    desc_ext = desc_node.text
                    
                desc_ext = desc_ext or ""
                
                # DEBUG: Log first 5 products that HAVE estesa attribute 
                if debug_count < 5 and desc_ext:
                    logger.debug(f"Product {code}: breve='{desc[:50]}...', estesa='{desc_ext[:80]}...'")
                    debug_count += 1
                
            desc = desc.strip() or code
            
            # Track voce nodes for later extended_description building
            if is_voce and desc_ext:
                voce_descriptions[code] = desc_ext.strip()
                logger.debug(f"Voce node: {code} -> '{desc_ext[:60]}...'")
            
            # Unit
            unit = prodotto.attrib.get("unitaDiMisuraId") or "nr"
            
            # Prices
            prices: Dict[str, float] = {}
            for quot in prodotto.findall(f"{self.ns}prdQuotazione"):
                list_id = quot.attrib.get("listaQuotazioneId")
                val_str = quot.attrib.get("valore")
                val = self._parse_float(val_str)
                if list_id and val is not None:
                    prices[list_id] = val
            
            prod = PriceListItem(
                id=prod_id,
                code=code,
                description=desc,
                long_description=desc_ext,
                unit=unit,
                price_by_list=prices
            )
            self._price_list_items[prod_id] = prod
        
        # SECOND PASS: Build extended_description for leaf items (items with prices)
        # by concatenating parent voce descriptions
        extended_count = 0
        for prod in self._price_list_items.values():
            # Skip if it's a voce node itself (no price) or has no code
            if not prod.price_by_list or not prod.code:
                continue
            
            # Build list of all code prefixes
            # Example: "1C.01.900.0010.d" -> ["1C", "1C.01", "1C.01.900", "1C.01.900.0010"]
            parts = prod.code.split('.')
            prefixes = []
            for i in range(1, len(parts)):
                prefix = '.'.join(parts[:i])
                prefixes.append(prefix)
            
            # Collect parent descriptions in order (root to immediate parent)
            parent_descriptions = []
            for prefix in prefixes:
                if prefix in voce_descriptions:
                    parent_descriptions.append(voce_descriptions[prefix])
            
            # Build extended_description if we found any parents
            if parent_descriptions:
                # Add own long_description at the end
                own_desc = prod.long_description or prod.description
                all_parts = parent_descriptions + [own_desc]
                prod.extended_description = ' '.join(all_parts).strip()
                extended_count += 1
                
                if extended_count <= 3:
                    logger.debug(f"Extended desc for {prod.code}: '{prod.extended_description[:100]}...'")
        
        # Final debug summary
        items_with_long_desc = sum(1 for p in self._price_list_items.values() if p.long_description)
        logger.info(f"Parsed {len(self._price_list_items)} products, {items_with_long_desc} have long_description, {extended_count} have extended_description")

    def _parse_rilevazione(self, node: ET.Element, index: int) -> Tuple[Measurement, Optional[int], List[Tuple[int, int]]] | None:
        prod_id = node.attrib.get("prodottoId")
        if not prod_id: return None
        
        # Ensure product exists (or create stub if XML was incomplete)
        if prod_id not in self._price_list_items:
             self._price_list_items[prod_id] = PriceListItem(id=prod_id, code="UNK", description="Unknown", unit="nr")
        
        # WBS Linking
        # Collect ALL referenced WBS nodes
        wbs_refs = []
        for grp_ref in node.findall(f"{self.ns}prvGrpValore"):
            ref_id = grp_ref.attrib.get("grpValoreId")
            if ref_id in self._group_ref_map:
                wbs_refs.append(ref_id)
        
        # Measurement Details
        details: List[MeasurementDetail] = []
        row_idx = 0
        total_qty = Decimal(0)
        
        # <prvVediVoce id="uuid" /> or similar reference
        # Usually inside prvRilevazione. 
        # Check if this node HAS a vedi voce tag
        vedi_voce_node = node.find(f"{self.ns}prvVediVoce")
        related_id = None
        if vedi_voce_node is not None:
             logger.debug(f"Found prvVediVoce tag! {vedi_voce_node.attrib}")
             related_id = vedi_voce_node.attrib.get("rifId") or vedi_voce_node.attrib.get("id")
             if related_id:
                 logger.debug(f"Extracted related_id: {related_id}")
        else:
             # Debug check for ANY child with 'Vedi' in tag
             for child in list(node):
                 if 'Vedi' in child.tag:
                     logger.debug(f"Suspicious tag found: {child.tag} Attribs: {child.attrib}")

        # Check raw quantity on the node itself just in case
        # But we prefer sum of parts
        
        # Local storage for this valid node's progressivo references
        node_refs: List[Tuple[int, int]] = [] 
        
        running_sign = 1  # Stateful sign tracking for 'A DEDURRE' blocks
        
        for misura in node.findall(f"{self.ns}prvMisura"):
            # Parse formula text for display
            formula = self._get_text(misura, "msrFormula") or ""
            
            # Attributes parsing (standard) - round each to 2 decimals
            def _round_2dp(val):
                if val is None: return None
                return float(Decimal(str(val)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
            
            length = _round_2dp(self._parse_float(misura.attrib.get("lung")))
            width = _round_2dp(self._parse_float(misura.attrib.get("larg")))
            height = _round_2dp(self._parse_float(misura.attrib.get("alt")))
            parts = _round_2dp(self._parse_float(misura.attrib.get("parti")))
            
            # Cell parsing (prvCella) - overrides/supplements attributes if present
            # Format: <prvCella testo="17.50" posizione="1" />
            cells = []
            
            # Determine sign with stateful logic (Context: "A DEDURRE" sets mode for following lines)
            operazione = misura.attrib.get("operazione", "").strip()
            
            if operazione == "-":
                running_sign = -1
                segno = -1
            elif operazione == "+":
                running_sign = 1
                segno = 1
            else:
                # Inherit from previous measure's state
                segno = running_sign

            misura_refs: List[Tuple[int, int]] = [] # References found within this specific misura

            # Calculate row multiplier base (1.0 default)
            row_multiplier = 1.0
            
            # 1. Try attributes
            dims = [parts, length, width, height]
            valid_dims = [d for d in dims if d is not None]
            
            if valid_dims:
                # Calculate from attributes (already rounded above)
                prod = Decimal("1.0")
                if parts is not None: prod *= Decimal(str(parts))
                if length is not None: prod *= Decimal(str(length))
                if width is not None: prod *= Decimal(str(width))
                if height is not None: prod *= Decimal(str(height))
                row_multiplier = float(prod.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
            else:
                # 2. Try Cells
                for cella in misura.findall(f"{self.ns}prvCella"):
                     txt = cella.attrib.get("testo", "")
                     pos = int(cella.attrib.get("posizione", "0"))
                     val = self._parse_float(txt)
                     if val is not None:
                         # Round each cell value to 2 decimals BEFORE multiplication
                         val_rounded = float(Decimal(str(val)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
                         cells.append((pos, val_rounded, txt))
                
                cells.sort(key=lambda x: x[0])
                if cells:
                    prod = Decimal("1.0")
                    for c in cells:
                         # Multiply rounded values
                         prod *= Decimal(str(c[1]))
                    # Round the product as well
                    row_multiplier = float(prod.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
                    
                    # Debug for L032.020.07 (prodottoId 11524)
                    prod_id = node.attrib.get("prodottoId")
                    if prod_id == "11524":
                        cell_details = [(c[2], c[1]) for c in cells]  # (raw_text, rounded_val)
                        logger.debug(f"[L032.020.07] Cells: {cell_details} -> prod={float(prod):.6f} -> row_multiplier={row_multiplier}")
                    
                    # Map first 3 found cells to L/W/H for UI
                    if len(cells) >= 1: length = cells[0][1]
                    if len(cells) >= 2: width = cells[1][1]
                    if len(cells) >= 3: height = cells[2][1]

            # 3. Always check prvCommento inside prvMisura
            for commento in misura.findall(f"{self.ns}prvCommento"):
                txt = commento.attrib.get("estesa") or commento.text or ""
                found_refs = self._extract_references(txt)
                if found_refs:
                    for ref in found_refs:
                        misura_refs.append(ref)

            # 4. Apply sign + multiplier to references
            final_refs = []
            for ref in misura_refs:
                final_mult = float(segno * row_multiplier)
                final_refs.append((ref, final_mult))
            
            # Add to node totals
            node_refs.extend(final_refs)

            
            # Construct raw formula if missing
            if not formula:
                 if cells:
                     # Join actual text representation to preserve formatting
                     formula = " * ".join(c[2] for c in cells)
                 else:
                     components = []
                     if parts is not None and parts != 1: components.append(str(parts))
                     if length is not None: components.append(str(length))
                     if width is not None: components.append(str(width))
                     if height is not None: components.append(str(height))
                     formula = "*".join(components)
            
            # Try to get pre-calculated row quantity if available
            row_qty = self._parse_float(misura.attrib.get("msrQuantita"))
            
            # If still 0/None, try to calculate from formula logic
            if (row_qty is None or row_qty == 0):
                 if valid_dims or cells:
                    row_qty = row_multiplier
            
            # FIX: If references found, ignore row quantity to avoid double counting
            if misura_refs:
                if row_qty and abs(row_qty) > 0.0001:
                     logger.info(f"Audit: DISCARDING local qty {row_qty} in node {node.attrib.get('progressivo')} due to refs {misura_refs}")
                row_qty = 0.0

            if row_qty is None: row_qty = 0.0
            
            # Apply the sign (+ or -) from operazione attribute parsed earlier
            # This handles deductions marked with operazione="-"
            if segno < 0:
                row_qty = -abs(row_qty)

            
            det = MeasurementDetail(
                row_index=row_idx,
                formula=formula,
                quantity=row_qty,
                length=length,
                width=width,
                height=height,
                parts=parts
            )
            details.append(det)
            
            # Round each row to 2 decimals (ceiling) BEFORE summing - matches TeamSystem behavior
            # Example: 4.0870500 becomes 4.09
            row_qty_decimal = Decimal(str(row_qty))
            rounded_row = row_qty_decimal.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            total_qty += rounded_row
            row_idx += 1
            
        progressivo_id = node.attrib.get("progressivo") or str(uuid.uuid4())
        
        # Try to parse numeric progressive for ordering
        prog_num = None
        if node.attrib.get("progressivo"):
            try:
                prog_num = float(node.attrib.get("progressivo"))
            except: pass

        if float(total_qty) == 0:
             # Debug: Why is qty 0?
             has_measurements = len(node.findall(f"{self.ns}prvMisura")) > 0
             msg = ""
             if has_measurements:
                 msg = f"[Parser] checking Node {progressivo_id}: Total Qty = 0 but has measurements! details={len(details)}"
             elif related_id:
                 msg = f"[Parser] Node {progressivo_id} (VediVoce {related_id}): Total Qty = 0. Has measurements: {has_measurements}"
             
             if msg:
                 logger.warning(msg)

        # Extract price list ID (listaQuotazioneId) from the rilevazione node
        price_list_id = node.attrib.get("listaQuotazioneId")
        
        # Return Tuple
        return (Measurement(
            id=progressivo_id,
            progressive=str(prog_num) if prog_num is not None else None, 
            wbs_node_ids=wbs_refs,
            product_id=prod_id,
            related_item_id=related_id,
            total_quantity=float(total_qty),
            details=details,
            price_list_id=price_list_id  # CRITICAL FIX: Pass the price list ID
        ), prog_num, node_refs)

    def _to_int(self, value: str | None) -> int | None:
        if value is None: return None
        try:
             return int(float(value.strip()))
        except: return None

    def _extract_references(self, text: str) -> list[int]:
        if not text: return []
        refs = []
        matches = _REFERENCE_PATTERN.findall(text)
        for match in matches:
            # find the non-empty group
            for val in match:
                if val:
                    try:
                        refs.append(int(val))
                    except: pass
        return refs

    def _resolve_quantity(self, prog: int, raw_map: dict, ref_map: dict, stack: set) -> float:
        if prog in stack:
            # Cycle detected
            return 0.0
        
        stack.add(prog)
        
        # Base raw qty
        total = raw_map.get(prog, 0.0)
        
        # Add refs
        refs = ref_map.get(prog, [])
        if refs:
             logger.debug(f"[Resolve] {prog} has refs: {refs} (Base: {total})")

        for ref_prog, sign in refs:
            # Recursive resolve
            ref_qty = self._resolve_quantity(ref_prog, raw_map, ref_map, stack)
            total += (ref_qty * sign)
            
        stack.remove(prog)
        if refs:
             logger.debug(f"[Resolve] {prog} -> Final: {total}")
             
        # Legacy Rounding: Round final resolved quantity to 2 decimals
        # Avoid float precision issues by converting to string first
        try:
            rounded_total = float(Decimal(f"{total:.10f}").quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
        except Exception as e:
            logger.error(f"Rounding failed for {prog}: {e}")
            rounded_total = total
            
        return rounded_total

    def _get_text(self, node: ET.Element, tag: str, attr: str | None = None) -> str | None:
        child = node.find(f"{self.ns}{tag}")
        if child is not None:
             if attr:
                 return child.attrib.get(attr, "")
             return child.text
        return None

    def _parse_float(self, val: str | None) -> float | None:
        if not val: return None
        try:
            return float(val.replace(",", "."))
        except ValueError:
            # Fallback: Try to evaluate simple arithmetic expression
            return self._eval_expression(val)

    def _eval_expression(self, val: str) -> float | None:
        """
        Evaluates simple arithmetic expressions safely using Decimal for precision.
        Allowed: digits, . , + - * / ( )
        """
        clean = val.replace(",", ".").strip()
            # Regex to ensure safety: digits, math chars, and comparison operators
        if not re.match(r'^[\d\s\.\+\-\*\/\(\)<>=]+$', clean):
            return None
        
        try:
            # Handle equality operator "=" (legacy) -> "=="
            # Use regex to replace '=' with '==' but avoid breaking '<=' or '>=' if present
            # Lookbehind: not preceded by < or > or ! or =
            # Lookahead: not followed by =
            expr_ready = re.sub(r'(?<![<>!=])=(?![=])', '==', clean)
            
            # Use Decimal for precise arithmetic
            # Replace numbers with Decimal() constructor calls
            import re as re_mod
            def to_decimal_expr(expr):
                # Find all numbers and wrap them in Decimal()
                return re_mod.sub(r'(\d+\.?\d*)', r'Decimal("\1")', expr)
            
            decimal_expr = to_decimal_expr(expr_ready)
            result = eval(decimal_expr, {"Decimal": Decimal, "__builtins__": {}})
            
            # Convert boolean result to float (True=1.0, False=0.0)
            if isinstance(result, bool):
                return 1.0 if result else 0.0
                
            return float(result)
        except:
            return None


    def _reconstruct_hierarchy(self, estimate: NormalizedEstimate):
        """
        Infers WBS hierarchy.
        User simplified requirement: "Concentrate on level, no parent-child relationships".
        """
        for n in self._wbs_nodes.values():
            if not n.code: continue

            # If level is currently 99 or unknown, try to infer from dots
            # Example: A -> Level 1, A.B -> Level 2
            if n.level > 10: 
                 dots = n.code.count('.')
                 n.level = dots + 1
            
            # Parent ID linking removed as per user request (flat groups)
            # n.parent_id = ...

    def _link_products_to_wbs(self, estimate: NormalizedEstimate):
        """
        Links Products to WBS Nodes based on Code prefix matching.
        User requirement: Link ALL matching WBS nodes found in the code structure (e.g. A001 AND A001.010).
        """
        # Build lookup for WBS codes
        # Sort codes by length descending to match longest prefix first
        sorted_wbs_codes = sorted(
            [n.code for n in self._wbs_nodes.values() if n.code], 
            key=len, 
            reverse=True
        )
        
        # Map Code -> NodeID
        wbs_code_map = {n.code: n.id for n in self._wbs_nodes.values() if n.code}
        
        for prod in self._price_list_items.values():
             if not prod.code: continue
             
             # Multi-Tagging Strategy:
             # Iterate all known WBS codes. If product code starts with WBS code, link it.
             # This captures the full hierarchy implicitly (Category, Subcategory, etc.)
             
             for wbs_code in sorted_wbs_codes:
                 if prod.code.startswith(wbs_code):
                     match_id = wbs_code_map[wbs_code]
                     # Avoid duplicates if any
                     if match_id not in prod.wbs_ids:
                         prod.wbs_ids.append(match_id)
