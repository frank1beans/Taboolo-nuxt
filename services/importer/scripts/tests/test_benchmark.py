
import os
import sys
import json
import logging
import asyncio
import time
from typing import List, Dict, Any, Optional, Tuple

# Add importer root to sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
IMPORTER_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
if IMPORTER_DIR not in sys.path:
    sys.path.append(IMPORTER_DIR)

from embedding.extraction.llm_extractor import LLMExtractor
from embedding.extraction.router import FamilyRouter
from embedding.extraction.schemas.core import CoreProperties
from embedding.extraction.schemas.cartongesso import CartongessoProperties
from embedding.extraction.schemas.serramenti import SerramentiProperties
from embedding.extraction.schemas.pavimenti import PavimentiProperties
from embedding.extraction.schemas.controsoffitti import ControsoffittiProperties
from embedding.extraction.schemas.rivestimenti import RivestimentiProperties
from embedding.extraction.schemas.coibentazione import CoibentazioneProperties
from embedding.extraction.schemas.impermeabilizzazione import ImpermeabilizzazioneProperties
from embedding.extraction.schemas.opere_murarie import OpereMurarieProperties
from embedding.extraction.schemas.facciate_cappotti import FacciateCappottiProperties
from embedding.extraction.schemas.apparecchi_sanitari import ApparecchiSanitariProperties
from embedding.extraction.postprocessor import postprocess_properties

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def _load_candidates(path: str) -> List[Dict[str, Any]]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if isinstance(data, dict) and "families" in data:
        flattened = []
        for family, items in data.get("families", {}).items():
            for item in items:
                merged = dict(item)
                merged["family"] = family
                flattened.append(merged)
        return flattened

    return data


def _select_schema(family: str) -> Tuple[Any, str]:
    schema_map = {
        "cartongesso": (CartongessoProperties, "CartongessoProperties"),
        "serramenti": (SerramentiProperties, "SerramentiProperties"),
        "pavimenti": (PavimentiProperties, "PavimentiProperties"),
        "controsoffitti": (ControsoffittiProperties, "ControsoffittiProperties"),
        "rivestimenti": (RivestimentiProperties, "RivestimentiProperties"),
        "coibentazione": (CoibentazioneProperties, "CoibentazioneProperties"),
        "impermeabilizzazione": (ImpermeabilizzazioneProperties, "ImpermeabilizzazioneProperties"),
        "opere_murarie": (OpereMurarieProperties, "OpereMurarieProperties"),
        "facciate_cappotti": (FacciateCappottiProperties, "FacciateCappottiProperties"),
        "apparecchi_sanitari": (ApparecchiSanitariProperties, "ApparecchiSanitariProperties"),
    }
    return schema_map.get(family, (CoreProperties, "CoreProperties"))


def _extract_item(
    extractor: LLMExtractor,
    router: FamilyRouter,
    item: Dict[str, Any],
    force_family: Optional[str],
) -> Dict[str, Any]:
    description = item["description"]

    if force_family:
        family = force_family
        score = 1.0
    elif item.get("family"):
        family = item["family"]
        score = 1.0
    else:
        matches = router.route(description, top_k=1)
        if matches:
            family = matches[0].family_id
            score = matches[0].score
        else:
            family = "core"
            score = 0.0

    schema_cls, schema_name = _select_schema(family)
    schema_model = schema_cls()

    schema_template = {
        field: {"value": None, "evidence": None, "confidence": 0.0}
        for field in type(schema_model).model_fields
    }

    extracted_data = extractor.extract(
        description=description,
        schema=schema_template,
        family=family
    )
    extracted_data = postprocess_properties(extracted_data, min_confidence=0.0)

    valid_slots = sum(1 for v in extracted_data.values() if v.get("value") is not None)
    avg_conf = (
        sum(v.get("confidence", 0) for v in extracted_data.values()) / len(extracted_data)
        if extracted_data
        else 0
    )

    return {
        "id": item.get("id"),
        "code": item.get("code"),
        "wbs6": item.get("wbs6"),
        "description": description,
        "predicted_family": family,
        "router_score": score,
        "extraction": extracted_data,
        "meta": {
            "valid_slots_count": valid_slots,
            "avg_confidence": round(avg_conf, 2)
        },
    }


async def run_benchmark():
    # 1. Load candidates
    script_dir = os.path.dirname(os.path.abspath(__file__))
    candidates_path = os.getenv("BENCHMARK_INPUT")
    if not candidates_path:
        candidates_path = os.path.join(IMPORTER_DIR, "embedding", "extraction", "goldenset_candidates.json")
        if not os.path.exists(candidates_path):
            candidates_path = os.path.join(IMPORTER_DIR, "scripts", "benchmark_data", "goldenset_candidates.json")

    candidates = _load_candidates(candidates_path)
        
    print(f"\nLoaded {len(candidates)} candidates.")
    
    # 2. Initialize components
    router = FamilyRouter()
    provider = os.getenv("BENCHMARK_PROVIDER", os.getenv("EXTRACTION_LLM_PROVIDER", "mistral"))
    model = os.getenv("BENCHMARK_MODEL", os.getenv("EXTRACTION_LLM_MODEL", "mistral-large-latest"))
    extractor = LLMExtractor(provider=provider, model=model, max_retries=2)
    
    results = []
    stats = {
        "total": len(candidates),
        "processed": 0,
        "errors": 0,
        "families": {},
        "avg_confidence": 0.0
    }
    
    force_family = os.getenv("BENCHMARK_FORCE_FAMILY")
    concurrency = max(1, int(os.getenv("BENCHMARK_CONCURRENCY", "1")))
    sleep_seconds = float(os.getenv("BENCHMARK_SLEEP_SECONDS", "0.5"))
    max_rps_env = os.getenv("BENCHMARK_MAX_RPS")
    if max_rps_env is not None:
        max_rps = float(max_rps_env)
    else:
        max_rps = 1.0 if provider == "mistral" else 0.0

    print("\nStarting extraction benchmark (Full Run on new candidates)...")

    semaphore = asyncio.Semaphore(concurrency)
    rate_lock = asyncio.Lock()
    next_allowed = 0.0

    async def enforce_rate_limit() -> None:
        nonlocal next_allowed
        if max_rps <= 0:
            return
        async with rate_lock:
            now = time.monotonic()
            wait_time = max(0.0, next_allowed - now)
            if wait_time > 0:
                await asyncio.sleep(wait_time)
            next_allowed = time.monotonic() + (1.0 / max_rps)

    async def worker(index: int, item: Dict[str, Any]) -> Dict[str, Any]:
        async with semaphore:
            description = item.get("description", "")
            print(f"[{index + 1}/{len(candidates)}] Processing: {description[:50]}...")
            start_t = time.time()
            try:
                await enforce_rate_limit()
                result = await asyncio.to_thread(
                    _extract_item,
                    extractor,
                    router,
                    item,
                    force_family,
                )
                duration = time.time() - start_t
                result["meta"]["duration_seconds"] = round(duration, 2)
                result["meta"]["index"] = index
                return result
            except Exception as e:
                logger.error(f"Error processing item {item.get('id')}: {e}")
                return {"error": str(e), "meta": {"index": index}}
            finally:
                if sleep_seconds > 0:
                    await asyncio.sleep(sleep_seconds)

    tasks = [worker(i, item) for i, item in enumerate(candidates)]
    completed = await asyncio.gather(*tasks)

    for item in completed:
        if "error" in item:
            stats["errors"] += 1
            continue
        family = item.get("predicted_family", "core")
        stats["processed"] += 1
        stats["families"][family] = stats["families"].get(family, 0) + 1
        stats["avg_confidence"] += item.get("meta", {}).get("avg_confidence", 0.0)
        results.append(item)
            
    # Finalize stats
    if stats["processed"] > 0:
        stats["avg_confidence"] /= stats["processed"]
        
    print(f"\nBenchmark finished!")
    print(f"Stats: {json.dumps(stats, indent=2)}")
    
    # Save results
    output_path = os.getenv("BENCHMARK_OUTPUT")
    if not output_path:
        output_dir = os.path.dirname(candidates_path)
        output_path = os.path.join(output_dir, "benchmark_results.json")
    results.sort(key=lambda x: x.get("meta", {}).get("index", 0))
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({
            "stats": stats,
            "details": results
        }, f, indent=2, ensure_ascii=False)
        
    print(f"Results saved to {output_path}")

if __name__ == "__main__":
    asyncio.run(run_benchmark())

