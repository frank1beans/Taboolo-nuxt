import os
import sys
import unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if ROOT not in sys.path:
    sys.path.append(ROOT)

from logic.extraction.router import FamilyRouter


class TestFamilyRouter(unittest.TestCase):
    def setUp(self) -> None:
        self.router = FamilyRouter()

    def _assert_best(self, text: str, expected: str) -> None:
        matches = self.router.route(text, top_k=1)
        self.assertTrue(matches, f"Expected match for: {text}")
        self.assertEqual(matches[0].family_id, expected)

    def test_cartongesso_match(self) -> None:
        self._assert_best("Parete in cartongesso con orditura metallica.", "cartongesso")

    def test_serramenti_match(self) -> None:
        self._assert_best("Porta a battente in legno con telaio standard.", "serramenti")

    def test_pavimenti_match(self) -> None:
        self._assert_best("Pavimento in gres porcellanato 60x60.", "pavimenti")

    def test_no_match_fallback(self) -> None:
        matches = self.router.route("Muro in mattoni pieni.", top_k=1)
        self.assertEqual(len(matches), 0)

    def test_wbs6_match(self) -> None:
        matches = self.router.route_wbs6("Pareti in cartongesso", top_k=1)
        self.assertTrue(matches)
        self.assertEqual(matches[0].family_id, "cartongesso")

    def test_wbs6_serramenti_match(self) -> None:
        matches = self.router.route_wbs6("Serramenti esterni in alluminio", top_k=1)
        self.assertTrue(matches)
        self.assertEqual(matches[0].family_id, "serramenti")

    def test_wbs6_pavimenti_match(self) -> None:
        matches = self.router.route_wbs6("Pavimenti e rivestimenti in gres", top_k=1)
        self.assertTrue(matches)
        self.assertEqual(matches[0].family_id, "pavimenti")

    def test_wbs6_controsoffitti_match(self) -> None:
        matches = self.router.route_wbs6("Controsoffitti in fibra minerale", top_k=1)
        self.assertTrue(matches)
        self.assertEqual(matches[0].family_id, "controsoffitti")

    def test_wbs6_rivestimenti_match(self) -> None:
        matches = self.router.route_wbs6("Opere di rivestimento", top_k=1)
        self.assertTrue(matches)
        self.assertEqual(matches[0].family_id, "rivestimenti")

    def test_wbs6_coibentazione_match(self) -> None:
        matches = self.router.route_wbs6("Opere di coibentazione", top_k=1)
        self.assertTrue(matches)
        self.assertEqual(matches[0].family_id, "coibentazione")

    def test_wbs6_impermeabilizzazione_match(self) -> None:
        matches = self.router.route_wbs6("Opere di impermeabilizzazione", top_k=1)
        self.assertTrue(matches)
        self.assertEqual(matches[0].family_id, "impermeabilizzazione")

    def test_wbs6_opere_murarie_match(self) -> None:
        matches = self.router.route_wbs6("Opere murarie", top_k=1)
        self.assertTrue(matches)
        self.assertEqual(matches[0].family_id, "opere_murarie")

    def test_wbs6_facciate_cappotti_match(self) -> None:
        matches = self.router.route_wbs6("Opere da facciatista e cappottista", top_k=1)
        self.assertTrue(matches)
        self.assertEqual(matches[0].family_id, "facciate_cappotti")

    def test_wbs6_apparecchi_sanitari_match(self) -> None:
        matches = self.router.route_wbs6("Apparecchi sanitari e accessori", top_k=1)
        self.assertTrue(matches)
        self.assertEqual(matches[0].family_id, "apparecchi_sanitari")

    def test_wbs6_assistenze_murarie_no_match(self) -> None:
        matches = self.router.route_wbs6("Assistenze murarie", top_k=1)
        self.assertEqual(len(matches), 0)

    def test_wbs6_no_match(self) -> None:
        matches = self.router.route_wbs6("Impianti di cantiere", top_k=1)
        self.assertEqual(len(matches), 0)


if __name__ == "__main__":
    unittest.main()
