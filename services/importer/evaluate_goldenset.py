import argparse
import json
import math
import os
from typing import Any, Dict, List, Optional

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_CANDIDATES_PATH = os.path.join(BASE_DIR, "embedding", "extraction", "goldenset_candidates.json")
DEFAULT_PREDICTIONS_PATH = os.path.join(BASE_DIR, "embedding", "extraction", "benchmark_results.json")
DEFAULT_OUTPUT_PATH = os.path.join(BASE_DIR, "embedding", "extraction", "goldenset_metrics.json")


def _load_json(path: str) -> Any:
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def _normalize_str(value: str) -> str:
    cleaned = " ".join(value.strip().lower().split())
    cleaned = cleaned.replace(",", ".")
    return cleaned


def _normalize_value(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, list):
        return [_normalize_value(v) for v in value]
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        return _normalize_str(value)
    return _normalize_str(str(value))


def _parse_number(value: Any) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(_normalize_str(value))
        except ValueError:
            return None
    return None


def _matches(expected: Any, predicted: Any) -> bool:
    if expected is None:
        return predicted is None

    if predicted is None:
        return False

    if isinstance(expected, list):
        if isinstance(predicted, list):
            expected_norm = sorted(_normalize_value(expected))
            predicted_norm = sorted(_normalize_value(predicted))
            return expected_norm == predicted_norm
        expected_norm = _normalize_value(expected)
        predicted_norm = _normalize_value(predicted)
        return predicted_norm in expected_norm

    if isinstance(predicted, list):
        expected_norm = _normalize_value(expected)
        predicted_norm = _normalize_value(predicted)
        return expected_norm in predicted_norm

    expected_num = _parse_number(expected)
    predicted_num = _parse_number(predicted)
    if expected_num is not None and predicted_num is not None:
        return math.isclose(expected_num, predicted_num, rel_tol=0.0, abs_tol=0.05)

    expected_norm = _normalize_value(expected)
    predicted_norm = _normalize_value(predicted)

    if isinstance(expected_norm, str):
        expected_norm = expected_norm.replace(" ", "")
    if isinstance(predicted_norm, str):
        predicted_norm = predicted_norm.replace(" ", "")

    return expected_norm == predicted_norm


def _extract_predicted_value(extraction: Dict[str, Any], slot: str) -> Any:
    if slot not in extraction:
        return None
    slot_data = extraction.get(slot)
    if isinstance(slot_data, dict):
        return slot_data.get("value")
    return slot_data


def evaluate(
    candidates: List[Dict[str, Any]],
    predictions_by_id: Dict[str, Dict[str, Any]],
    skip_missing_predictions: bool,
) -> Dict[str, Any]:
    slot_metrics: Dict[str, Dict[str, int]] = {}
    used_items = 0
    skipped_items = 0
    missing_predictions = 0

    for item in candidates:
        item_id = item.get("id")
        expected_props = item.get("expected_properties") or {}

        if not expected_props:
            skipped_items += 1
            continue

        extraction = predictions_by_id.get(item_id)
        if extraction is None:
            if skip_missing_predictions:
                missing_predictions += 1
                continue
            extraction = {}

        used_items += 1

        for slot, expected_value in expected_props.items():
            stats = slot_metrics.setdefault(
                slot,
                {"tp": 0, "fp": 0, "fn": 0, "tn": 0, "mismatch": 0},
            )

            predicted_value = _extract_predicted_value(extraction, slot)

            if expected_value is None:
                if predicted_value is None:
                    stats["tn"] += 1
                else:
                    stats["fp"] += 1
                continue

            if predicted_value is None:
                stats["fn"] += 1
                continue

            if _matches(expected_value, predicted_value):
                stats["tp"] += 1
            else:
                stats["fn"] += 1
                stats["fp"] += 1
                stats["mismatch"] += 1

    results: Dict[str, Any] = {
        "items_used": used_items,
        "items_skipped": skipped_items,
        "items_missing_predictions": missing_predictions,
        "slots": {},
    }

    for slot, stats in sorted(slot_metrics.items()):
        tp = stats["tp"]
        fp = stats["fp"]
        fn = stats["fn"]
        support = tp + fn
        predicted = tp + fp

        precision = tp / predicted if predicted else None
        recall = tp / support if support else None

        results["slots"][slot] = {
            "precision": precision,
            "recall": recall,
            "support": support,
            "tp": tp,
            "fp": fp,
            "fn": fn,
            "mismatch": stats["mismatch"],
        }

    return results


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate extraction against labeled goldenset.")
    parser.add_argument(
        "--candidates",
        default=DEFAULT_CANDIDATES_PATH,
        help="Path to goldenset candidates JSON.",
    )
    parser.add_argument(
        "--predictions",
        default=DEFAULT_PREDICTIONS_PATH,
        help="Path to benchmark results JSON.",
    )
    parser.add_argument(
        "--output",
        default=DEFAULT_OUTPUT_PATH,
        help="Path to write metrics JSON.",
    )
    parser.add_argument(
        "--skip-missing",
        action="store_true",
        help="Skip items missing predictions in the benchmark results.",
    )
    args = parser.parse_args()

    candidates = _load_json(args.candidates)
    benchmark = _load_json(args.predictions)

    predictions_by_id = {
        item.get("id"): item.get("extraction", {})
        for item in benchmark.get("details", [])
    }

    results = evaluate(candidates, predictions_by_id, skip_missing_predictions=args.skip_missing)

    with open(args.output, "w", encoding="utf-8") as handle:
        json.dump(results, handle, indent=2, ensure_ascii=False)

    print(json.dumps(results, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
