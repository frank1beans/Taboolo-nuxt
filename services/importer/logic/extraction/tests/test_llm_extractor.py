import os
import sys
import unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if ROOT not in sys.path:
    sys.path.append(ROOT)

from logic.extraction.llm_extractor import LLMExtractor


class TestLLMExtractor(unittest.TestCase):
    def setUp(self) -> None:
        self.extractor = LLMExtractor(provider="ollama", model="fake", max_retries=0)

    def test_parse_json_code_block(self) -> None:
        raw = """```json
{"material": {"value": "cartongesso", "evidence": "cartongesso", "confidence": 1}}
```"""
        parsed = self.extractor._parse_json(raw)
        self.assertEqual(parsed["material"]["value"], "cartongesso")

    def test_validate_response_clamps_confidence(self) -> None:
        schema = {
            "material": {"value": None, "evidence": None, "confidence": 0.0},
            "thickness_mm": {"value": None, "evidence": None, "confidence": 0.0},
        }
        parsed = {
            "material": {"value": "cartongesso", "evidence": "cartongesso", "confidence": 2},
        }
        validated = self.extractor._validate_response(parsed, schema)
        self.assertEqual(validated["material"]["confidence"], 1.0)
        self.assertIn("thickness_mm", validated)

    def test_validate_response_handles_invalid_confidence(self) -> None:
        schema = {
            "material": {"value": None, "evidence": None, "confidence": 0.0},
        }
        parsed = {
            "material": {"value": "cartongesso", "evidence": "cartongesso", "confidence": "bad"},
        }
        validated = self.extractor._validate_response(parsed, schema)
        self.assertEqual(validated["material"]["confidence"], 0.0)


if __name__ == "__main__":
    unittest.main()
