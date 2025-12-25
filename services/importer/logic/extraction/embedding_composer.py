import logging
from collections import Counter
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from logic.embedding import JinaEmbedder
from logic.extraction.props_text import build_weighted_props_text

logger = logging.getLogger(__name__)


class EmbeddingComposer:
    """
    Compose embeddings for base text (original description) and detail text
    (extracted properties). Combines them with configurable weights.
    """

    def __init__(
        self,
        embedder: Optional[JinaEmbedder] = None,
        base_weight: float = 0.4,
        detail_weight: float = 0.6,
        use_weighted_props: bool = False,
        use_two_pass_embedding: bool = True,
        props_replication_k: int = 3,
    ):
        self.embedder = embedder or JinaEmbedder()
        self.base_weight = base_weight
        self.detail_weight = detail_weight
        self.use_weighted_props = bool(use_weighted_props)
        self.use_two_pass_embedding = bool(use_two_pass_embedding)
        self.props_replication_k = int(props_replication_k)

    def _get_field(self, item: Any, field: str) -> Any:
        if isinstance(item, dict):
            return item.get(field)
        return getattr(item, field, None)

    def _pick_description(self, item: Any) -> str:
        return (
            self._get_field(item, "extended_description")
            or self._get_field(item, "extendedDescription")
            or self._get_field(item, "long_description")
            or self._get_field(item, "longDescription")
            or self._get_field(item, "description")
            or ""
        )

    def _pick_wbs6_text(self, item: Any) -> Optional[str]:
        for field in (
            "wbs6_normalized",
            "wbs06_normalized",
            "wbs6_desc",
            "wbs06_desc",
            "wbs6_code",
            "wbs6",
            "wbs06",
        ):
            value = self._get_field(item, field)
            if value:
                return str(value)
        return None

    def compose_text(
        self,
        description: str,
        extracted_props: Optional[Dict[str, Dict[str, Any]]],
        category: Optional[str] = None,
        wbs6_text: Optional[str] = None,
        min_confidence: float = 0.5,
    ) -> Tuple[str, str]:
        base_text = (description or "").strip()

        detail_text = ""
        if self.use_weighted_props:
            props_min_conf = 0.0 if min_confidence is None else float(min_confidence)
            detail_text = build_weighted_props_text(
                extracted_props if isinstance(extracted_props, dict) else {},
                category=category,
                wbs6_text=wbs6_text,
                k=self.props_replication_k,
                min_confidence=props_min_conf,
            )
        else:
            detail_parts: List[str] = []
            if extracted_props:
                for key, slot in extracted_props.items():
                    if not isinstance(slot, dict):
                        continue
                    value = slot.get("value")
                    confidence = slot.get("confidence", 0.0) or 0.0
                    if value is None or confidence < min_confidence:
                        continue
                    if isinstance(value, list):
                        value_text = ", ".join(str(v) for v in value)
                    else:
                        value_text = str(value)
                    detail_parts.append(f"{key}: {value_text}")

            detail_text = " | ".join(detail_parts) if detail_parts else ""
        return base_text, detail_text

    def _normalize_weights(self) -> Tuple[float, float]:
        total = self.base_weight + self.detail_weight
        if total <= 0:
            return 0.5, 0.5
        return self.base_weight / total, self.detail_weight / total

    def compute_weighted_embedding(
        self,
        base_text: str,
        detail_text: str,
    ) -> Optional[List[float]]:
        base_text = (base_text or "").strip()
        detail_text = (detail_text or "").strip()

        if not self.use_two_pass_embedding:
            combined_text = base_text if not detail_text else f"{base_text} | {detail_text}"
            if not combined_text:
                return None
            embeddings = self.embedder.compute_embeddings([combined_text])
            return embeddings[0] if embeddings else None

        texts: List[str] = []
        indices: Dict[str, int] = {}
        if base_text:
            indices["base"] = len(texts)
            texts.append(base_text)
        if detail_text:
            indices["detail"] = len(texts)
            texts.append(detail_text)

        if not texts:
            return None

        embeddings = self.embedder.compute_embeddings(texts)
        if not embeddings:
            return None

        base_vec = None
        detail_vec = None
        if "base" in indices:
            base_emb = embeddings[indices["base"]]
            if base_emb is not None:
                base_vec = np.array(base_emb)
        if "detail" in indices:
            detail_emb = embeddings[indices["detail"]]
            if detail_emb is not None:
                detail_vec = np.array(detail_emb)

        if base_vec is None and detail_vec is None:
            return None
        if base_vec is None:
            return detail_vec.tolist() if detail_vec is not None else None
        if detail_vec is None:
            if self.use_weighted_props:
                detail_vec = np.zeros_like(base_vec)
            else:
                return base_vec.tolist()

        base_w, detail_w = self._normalize_weights()
        combined = base_w * base_vec + detail_w * detail_vec
        norm = np.linalg.norm(combined)
        if norm > 0:
            combined = combined / norm
        return combined.tolist()

    def batch_compose(
        self,
        items: List[Any],
        properties_field: str = "extracted_properties",
        min_confidence: float = 0.5,
    ) -> List[Optional[List[float]]]:
        all_texts: List[str] = []
        indices: List[Tuple[int, str]] = []
        detail_texts: Dict[int, str] = {}
        empty_props = 0
        token_counter: Counter = Counter()

        for idx, item in enumerate(items):
            description = self._pick_description(item)
            extracted_props = self._get_field(item, properties_field)
            category = self._get_field(item, "category")
            wbs6_text = self._pick_wbs6_text(item)

            base_text, detail_text = self.compose_text(
                description,
                extracted_props,
                category=category,
                wbs6_text=wbs6_text,
                min_confidence=min_confidence,
            )

            if self.use_weighted_props:
                if not detail_text:
                    empty_props += 1
                else:
                    token_counter.update(detail_text.split())

            if not self.use_two_pass_embedding:
                combined_text = base_text if not detail_text else f"{base_text} | {detail_text}"
                if combined_text:
                    all_texts.append(combined_text)
                    indices.append((idx, "combined"))
                continue

            all_texts.append(base_text)
            indices.append((idx, "base"))

            if detail_text:
                all_texts.append(detail_text)
                indices.append((idx, "detail"))
            detail_texts[idx] = detail_text

        embeddings = self.embedder.compute_embeddings(all_texts)
        if not embeddings:
            return [None for _ in items]

        if not self.use_two_pass_embedding:
            results: List[Optional[List[float]]] = [None for _ in items]
            for emb_idx, (item_idx, _kind) in enumerate(indices):
                if emb_idx >= len(embeddings):
                    break
                vector = embeddings[emb_idx]
                if vector is None:
                    continue
                results[item_idx] = vector
            if self.use_weighted_props and items:
                empty_pct = (empty_props / len(items)) * 100.0
                logger.info(
                    "Weighted props_text empty: %d/%d (%.1f%%)",
                    empty_props,
                    len(items),
                    empty_pct,
                )
                if token_counter:
                    top_tokens = ", ".join(
                        f"{token}:{count}" for token, count in token_counter.most_common(10)
                    )
                    logger.debug("Weighted props_text top tokens: %s", top_tokens)
            return results

        item_embeddings: Dict[int, Dict[str, np.ndarray]] = {i: {} for i in range(len(items))}
        for emb_idx, (item_idx, emb_kind) in enumerate(indices):
            if emb_idx >= len(embeddings):
                break
            vector = embeddings[emb_idx]
            if vector is None:
                continue
            item_embeddings[item_idx][emb_kind] = np.array(vector)

        if self.use_weighted_props and items:
            empty_pct = (empty_props / len(items)) * 100.0
            logger.info(
                "Weighted props_text empty: %d/%d (%.1f%%)",
                empty_props,
                len(items),
                empty_pct,
            )
            if token_counter:
                top_tokens = ", ".join(
                    f"{token}:{count}" for token, count in token_counter.most_common(10)
                )
                logger.debug("Weighted props_text top tokens: %s", top_tokens)

        results: List[Optional[List[float]]] = []
        base_w, detail_w = self._normalize_weights()
        for i in range(len(items)):
            base_vec = item_embeddings[i].get("base")
            if base_vec is None:
                results.append(None)
                continue

            detail_vec = item_embeddings[i].get("detail")
            if detail_vec is not None:
                combined = base_w * base_vec + detail_w * detail_vec
                norm = np.linalg.norm(combined)
                if norm > 0:
                    combined = combined / norm
                results.append(combined.tolist())
            else:
                if self.use_weighted_props and not detail_texts.get(i):
                    detail_vec = np.zeros_like(base_vec)
                    combined = base_w * base_vec + detail_w * detail_vec
                    norm = np.linalg.norm(combined)
                    if norm > 0:
                        combined = combined / norm
                    results.append(combined.tolist())
                else:
                    results.append(base_vec.tolist())

        return results
