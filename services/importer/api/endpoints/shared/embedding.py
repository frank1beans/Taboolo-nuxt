"""
Shared Embedding Logic for Import Endpoints
Extracts common embedding computation from six.py and xpwe.py
"""

import os
from typing import List, Optional, Set
import logging

from infrastructure.dto import PriceList

logger = logging.getLogger(__name__)


def compute_embeddings_for_items(
    price_list: PriceList,
    used_pli_ids: Optional[Set[str]] = None,
    extract_properties: bool = False,
    base_weight: float = 0.4,
    detail_weight: float = 0.6,
    use_weighted_props: bool = False,
    use_two_pass_embedding: bool = True,
    props_replication_k: int = 3,
) -> int:
    """
    Compute embeddings for price list items.
    
    Args:
        price_list: The price list containing items to embed
        used_pli_ids: Optional set of IDs to filter which items to embed.
                      If None, all items are embedded.
        extract_properties: If True, use property-aware embedding composer
        base_weight: Weight for base description in property-aware mode
        detail_weight: Weight for extracted properties in property-aware mode
        use_weighted_props: Use weighted property text building
        use_two_pass_embedding: Use two-pass embedding strategy
        props_replication_k: Replication factor for property text
        
    Returns:
        Number of items successfully embedded
    """
    if not price_list.items:
        return 0
    
    try:
        # Determine which items to embed
        if used_pli_ids is not None:
            items_to_embed = []
            indices_map = []
            for idx, item in enumerate(price_list.items):
                if item.id in used_pli_ids:
                    items_to_embed.append(item)
                    indices_map.append(idx)
        else:
            items_to_embed = list(price_list.items)
            indices_map = list(range(len(price_list.items)))
        
        if not items_to_embed:
            logger.info("No items to embed")
            return 0
        
        logger.info(f"Computing embeddings for {len(items_to_embed)} items...")
        
        # Choose embedding strategy
        if extract_properties:
            from logic.extraction.embedding_composer import EmbeddingComposer
            composer = EmbeddingComposer(
                base_weight=base_weight,
                detail_weight=detail_weight,
                use_weighted_props=use_weighted_props,
                use_two_pass_embedding=use_two_pass_embedding,
                props_replication_k=props_replication_k,
            )
            vectors = composer.batch_compose(items_to_embed)
        else:
            from logic.embedding import get_embedder
            embedder = get_embedder()
            texts = []
            for item in items_to_embed:
                text = item.extended_description or item.long_description or item.description
                texts.append(text if text else "")
            vectors = embedder.compute_embeddings(texts)
        
        # Assign vectors back to items
        if len(vectors) != len(items_to_embed):
            logger.warning(f"Embedding count mismatch: {len(vectors)} vs {len(items_to_embed)}")
            return 0
        
        count = 0
        for i, vector in enumerate(vectors):
            if vector:
                original_idx = indices_map[i]
                price_list.items[original_idx].embedding = vector
                count += 1
        
        logger.info(f"Embeddings assigned for {count} items")
        return count
        
    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        import traceback
        traceback.print_exc()
        return 0


def get_used_pli_ids(estimate) -> Set[str]:
    """Extract the set of used PriceListItem IDs from an estimate."""
    used_ids = set()
    if estimate and estimate.items:
        for est_item in estimate.items:
            if est_item.price_list_item_id:
                used_ids.add(est_item.price_list_item_id)
    return used_ids
