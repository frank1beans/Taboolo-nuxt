
from typing import List
import re

from infrastructure.dto import WbsNode
from domain import NormalizedEstimate

class WbsLoader:
    @staticmethod
    def create(estimate: NormalizedEstimate, project_id: str) -> List[WbsNode]:
        groups = []
        for node in estimate.wbs_nodes:
            # Skip if no code (unless root?)
            if not node.code: continue
            
            groups.append(WbsNode(
                id=node.id, # Keep XML ID for linking (Explicit 'id' field)
                projectId=project_id,
                code=node.code,
                description=node.name or node.code,
                level=node.level,
                type=node.type, # Map parsed type to type
                parentId=node.parent_id,
                path=None # Can be computed if needed
            ))
            
        # Normalize WBS6 descriptions and compute embeddings
        WbsLoader._process_wbs6(groups)
        
        return groups

    @staticmethod
    def _clean_wbs_desc_for_import(desc: str, code: str) -> str:
        """Normalize WBS description by removing code prefix."""
        if not desc:
            return ""
        cleaned = desc.strip()
        if code:
            if cleaned.startswith(code):
                cleaned = cleaned[len(code):].strip()
        while cleaned and cleaned[0] in "-–:. ":
            cleaned = cleaned[1:].strip()
        cleaned = re.sub(r'\s+', ' ', cleaned)
        cleaned = cleaned.strip().title()
        return cleaned if cleaned else desc

    @staticmethod
    def _process_wbs6(groups: List[WbsNode]):
        # Collect WBS6 nodes and their normalized descriptions
        wbs6_groups = [g for g in groups if g.level == 6]
        
        if wbs6_groups:
            print(f"[Loader] Processing {len(wbs6_groups)} WBS6 nodes for normalization...", flush=True)
            
            # Normalize descriptions
            for g in wbs6_groups:
                g.normalized_description = WbsLoader._clean_wbs_desc_for_import(g.description, g.code)
            
            # Compute embeddings for unique normalized descriptions
            unique_descs = list(set(g.normalized_description for g in wbs6_groups if g.normalized_description))
            
            if unique_descs:
                print(f"[Loader] Computing embeddings for {len(unique_descs)} unique WBS6 categories...", flush=True)
                try:
                    from embedding import get_embedder
                    embedder = get_embedder()
                    embeddings = embedder.compute_embeddings(unique_descs)
                    
                    # Map description -> embedding
                    embedding_map = {}
                    for i, desc in enumerate(unique_descs):
                        if embeddings[i] is not None:
                            embedding_map[desc] = embeddings[i]
                    
                    # Assign embeddings to nodes
                    for g in wbs6_groups:
                        if g.normalized_description in embedding_map:
                            g.embedding = embedding_map[g.normalized_description]
                    
                    print(f"[Loader] Successfully computed {len(embedding_map)} WBS6 embeddings", flush=True)
                except Exception as e:
                    print(f"[Loader] WARNING: Failed to compute WBS6 embeddings: {e}", flush=True)

