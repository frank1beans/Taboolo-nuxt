from logic.extraction.props_text import build_weighted_props_text, get_category_weights


def _count_token(text: str, token: str) -> int:
    return sum(1 for t in text.split() if t == token)


def main() -> None:
    example_base = {
        "door_type": {"value": "a battente", "confidence": 0.5},
        "fire_class": {"value": "EI 60", "confidence": 0.9},
        "finish": {
            "value": "verniciato a polveri RAL 9010 finitura goffrato",
            "confidence": 0.8,
        },
        "width_cm": {"value": 90, "confidence": 0.9},
        "height_cm": {"value": 210, "confidence": 0.7},
    }

    props_ei60 = dict(example_base)
    props_ei30 = dict(example_base)
    props_ei30["fire_class"] = {"value": "EI 30", "confidence": 0.9}

    text_60 = build_weighted_props_text(props_ei60, category="serramenti", k=3)
    text_30 = build_weighted_props_text(props_ei30, category="serramenti", k=3)

    print("EI60:", text_60)
    print("EI30:", text_30)
    print("Different fire_class token:", "fire_class:ei_60" in text_60 and "fire_class:ei_30" in text_30)

    finish_checks = [
        ("finish string excluded", "verniciato_a_polveri" not in text_60),
        ("ral token", "ral:9010" in text_60),
        ("finish_type token", "finish_type:polveri" in text_60),
        ("texture token", "texture:goffrato" in text_60),
    ]
    for label, ok in finish_checks:
        print(f"{label}: {ok}")

    weights = get_category_weights("serramenti")
    base_weight = weights["door_type"]
    expected_reps = int(round(3 * base_weight * 0.5))
    door_token = "door_type:a_battente"
    actual_reps = _count_token(text_60, door_token)
    print("Replication check:", {"expected": expected_reps, "actual": actual_reps, "token": door_token})


if __name__ == "__main__":
    main()
