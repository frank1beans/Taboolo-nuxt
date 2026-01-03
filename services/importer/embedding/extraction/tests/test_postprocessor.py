import os
import sys
import unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if ROOT not in sys.path:
    sys.path.append(ROOT)

from embedding.extraction.postprocessor import postprocess_properties


class TestPostprocessor(unittest.TestCase):
    def test_numeric_normalization_mm(self) -> None:
        raw = {
            "thickness_mm": {"value": "12,5 mm", "evidence": "sp. 12,5 mm", "confidence": 1.0},
            "frame_spacing_mm": {"value": "60 cm", "evidence": "interasse 60 cm", "confidence": 1.0},
        }
        processed = postprocess_properties(raw)
        self.assertEqual(processed["thickness_mm"]["value"], 12.5)
        self.assertEqual(processed["frame_spacing_mm"]["value"], 600.0)

    def test_fire_class_normalization(self) -> None:
        raw = {
            "fire_class": {"value": "REI60", "evidence": "REI60", "confidence": 1.0},
        }
        processed = postprocess_properties(raw)
        self.assertEqual(processed["fire_class"]["value"], "REI 60")

    def test_board_layers_normalization(self) -> None:
        raw = {
            "board_layers": {"value": "doppia lastra", "evidence": "doppia lastra", "confidence": 1.0},
        }
        processed = postprocess_properties(raw)
        self.assertEqual(processed["board_layers"]["value"], 2)

    def test_board_type_normalization(self) -> None:
        raw = {
            "board_type": {"value": "GKB standard", "evidence": "GKB standard", "confidence": 1.0},
        }
        processed = postprocess_properties(raw)
        self.assertEqual(processed["board_type"]["value"], "GKB")

    def test_frame_type_filtering(self) -> None:
        raw = {
            "frame_type": {"value": "profilati metallici", "evidence": "profilati metallici", "confidence": 1.0},
        }
        processed = postprocess_properties(raw)
        self.assertIsNone(processed["frame_type"]["value"])


if __name__ == "__main__":
    unittest.main()

