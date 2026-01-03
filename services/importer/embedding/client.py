import logging
import os
import requests
from typing import List, Optional

logger = logging.getLogger(__name__)

JINA_API_URL = "https://api.jina.ai/v1/embeddings"

class JinaEmbedder:
    """
    Service to generate embeddings using Jina AI API.
    """
    def __init__(self, api_key: Optional[str] = None):
        # Allow passing key explicitly or fallback to env
        self.api_key = api_key or os.getenv("JINA_API_KEY")
        if not self.api_key:
            logger.warning("JINA_API_KEY not set. Embedding generation will be skipped or fail.")

    def compute_embeddings(self, texts: List[str], model: str = "jina-embeddings-v3") -> List[List[float]]:
        """
        Generate embeddings for a list of texts.
        Returns a list of vectors (list of floats).
        """
        if not self.api_key:
            logger.error("Attempted to compute embeddings without JINA_API_KEY.")
            return []

        if not texts:
            return []

        # Jina API has limits (e.g. 2048 items per batch for English). 
        # For simplicity we process in chunks of 50 to be safe and responsive.
        BATCH_SIZE = 50
        all_embeddings = []

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

        for i in range(0, len(texts), BATCH_SIZE):
            batch = texts[i : i + BATCH_SIZE]
            
            payload = {
                "model": model,
                "input": batch,
                # "embedding_type": "float" # Default is float
            }

            import time
            
            # Retry configuration
            max_retries = 3
            retry_delay = 2  # seconds

            for attempt in range(max_retries):
                try:
                    response = requests.post(JINA_API_URL, headers=headers, json=payload, timeout=30)
                    response.raise_for_status()
                    data = response.json()
                    
                    # Jina returns { "data": [ { "object": "embedding", "embedding": [...] }, ... ] }
                    # We need to preserve order.
                    batch_embeddings = [item["embedding"] for item in data.get("data", [])]
                    
                    if len(batch_embeddings) != len(batch):
                        logger.warning(f"Jina returned {len(batch_embeddings)} vectors for {len(batch)} inputs. Padding with None.")
                        # If mismatch, alignment is broken, but we continue processing next batches
                    
                    all_embeddings.extend(batch_embeddings)
                    break # Success, exit retry loop

                except Exception as e:
                    logger.error(f"Error calling Jina API (Attempt {attempt + 1}/{max_retries}): {e}")
                    if attempt < max_retries - 1:
                        time.sleep(retry_delay * (attempt + 1)) # Exponentialish backoff
                    else:
                        # Final failure for this batch
                        all_embeddings.extend([None] * len(batch))

        return all_embeddings

def get_embedder() -> JinaEmbedder:
    return JinaEmbedder()
