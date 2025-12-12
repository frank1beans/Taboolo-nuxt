import unittest
from decimal import Decimal

from importers.helpers.text_and_measure import head_to_tail_quantity, tokenize_description


class TestTextAndMeasure(unittest.TestCase):
    def test_head_to_tail_with_following_quantities(self) -> None:
        rows = [
            ("head", None, None),
            ("", 2.0, None),
            ("", 3.0, ""),
            (None, None, "X"),  # price value, stops
        ]
        self.assertEqual(head_to_tail_quantity(rows, 0, qty_col=1, price_col=2), 5.0)

    def test_head_to_tail_none_when_price_or_missing(self) -> None:
        rows = [
            ("head", None, None),
            ("", None, "10"),  # price set -> stop immediately
            ("", 4.0, None),
        ]
        self.assertIsNone(head_to_tail_quantity(rows, 0, qty_col=1, price_col=2))

    def test_tokenize_description_basic(self) -> None:
        tokens = tokenize_description("Ponteggio in acciaio, per edilizia.")
        self.assertEqual(tokens, ["ponteggio", "acciaio", "edilizia"])

    def test_tokenize_description_accents_numbers_stopwords(self) -> None:
        tokens = tokenize_description("Scavo di fondazione h=1.5 m, con mezzi meccanici")
        self.assertEqual(tokens, ["scavo", "fondazione", "h", "m", "mezzi", "meccanici"])


if __name__ == "__main__":
    unittest.main()
