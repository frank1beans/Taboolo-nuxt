from logic.extraction.props_text import build_weighted_props_text, get_category_weights


def test_weighted_props_text_fire_class_tokens():
    props_ei60 = {"fire_class": {"value": "EI 60", "confidence": 0.9}}
    props_ei30 = {"fire_class": {"value": "EI 30", "confidence": 0.9}}

    text_60 = build_weighted_props_text(props_ei60, category="serramenti", k=3)
    text_30 = build_weighted_props_text(props_ei30, category="serramenti", k=3)

    assert "fire_class:ei_60" in text_60
    assert "fire_class:ei_30" in text_30
    assert text_60 != text_30


def test_finish_microtokens_only():
    props = {
        "finish": {
            "value": "verniciato a polveri RAL 9010 finitura goffrato",
            "confidence": 0.8,
        }
    }

    text = build_weighted_props_text(props, category="serramenti", k=3)

    assert "finish:" not in text
    assert "verniciato_a_polveri" not in text
    assert "ral:9010" in text
    assert "finish_type:polveri" in text
    assert "texture:goffrato" in text


def test_replication_count_matches_confidence():
    props = {"door_type": {"value": "a battente", "confidence": 0.5}}
    text = build_weighted_props_text(props, category="serramenti", k=3)

    base_weight = get_category_weights("serramenti")["door_type"]
    expected = int(round(3 * base_weight * 0.5))
    token = "door_type:a_battente"
    actual = sum(1 for t in text.split() if t == token)

    assert actual == expected
