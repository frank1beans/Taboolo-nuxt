import sys
import os
from pathlib import Path
from dotenv import load_dotenv

# 1. Setup Environment
# Assuming this script is in services/importer/
base_dir = Path(__file__).resolve().parent
# Go up two levels to find .env (Taboolo-nuxt/.env)
dotenv_path = base_dir.parent.parent / '.env'

print(f"Loading .env from: {dotenv_path}")
load_dotenv(dotenv_path)

# 2. Setup Python Path to import logic.embedding
sys.path.append(str(base_dir))

try:
    from logic.embedding import JinaEmbedder
except ImportError as e:
    print(f"Error importing JinaEmbedder: {e}")
    sys.exit(1)

def test_jina():
    api_key = os.getenv("JINA_API_KEY")
    if not api_key:
        print("ERROR: JINA_API_KEY not found in environment variables.")
        return

    print(f"API Key found: {api_key[:5]}...{api_key[-5:]}")

    embedder = JinaEmbedder()
    test_text = "This is a test sentence for Jina embeddings."
    
    print(f"Sending request for text: '{test_text}'")
    try:
        embeddings = embedder.compute_embeddings([test_text])
        if embeddings and len(embeddings) > 0 and embeddings[0] is not None:
            vector = embeddings[0]
            print(f"SUCCESS! Received embedding.")
            print(f"Vector dimension: {len(vector)}")
            print(f"First 5 values: {vector[:5]}")
        else:
            print("FAILURE: No embeddings returned or returned None.")
            
    except Exception as e:
        print(f"EXCEPTION during call: {e}")

if __name__ == "__main__":
    test_jina()
