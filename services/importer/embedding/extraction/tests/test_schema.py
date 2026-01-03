import os
import sys
import unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if ROOT not in sys.path:
    sys.path.append(ROOT)

from embedding.extraction.schemas.core import CoreProperties, EvidenceSlot


class TestEvidenceSlot(unittest.TestCase):
    def test_is_valid_threshold(self) -> None:
        slot = EvidenceSlot(value="cartongesso", confidence=0.6)
        self.assertTrue(slot.is_valid(0.5))
        self.assertFalse(slot.is_valid(0.7))

    def test_is_valid_requires_value(self) -> None:
        slot = EvidenceSlot(value=None, confidence=1.0)
        self.assertFalse(slot.is_valid())


class TestCoreProperties(unittest.TestCase):
    def test_get_valid_slots(self) -> None:
        core = CoreProperties()
        core.material = EvidenceSlot(value="cartongesso", confidence=0.8)
        valid = core.get_valid_slots(min_confidence=0.5)
        self.assertIn("material", valid)
        self.assertNotIn("finish", valid)


if __name__ == "__main__":
    unittest.main()

