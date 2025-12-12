from decimal import Decimal
import unittest

from importers.models.raw import (
    RawGroupValue,
    RawMeasurement,
    RawPriceList,
    RawProduct,
    RawRilevazione,
)
from normalizers import (
    build_wbs_path,
    canonicalizza_price_lists,
    compute_quantity_direct,
    resolve_progressivo_quantities,
)


class TestNormalizers(unittest.TestCase):
    def test_canonicalizza_price_lists_alias_and_priority(self) -> None:
        lists = [
            RawPriceList(list_id_raw="L1", label="Prezzi Base"),
            RawPriceList(list_id_raw="base", label="base"),
            RawPriceList(list_id_raw="Progetto-Default", label="Listino Progetto"),
        ]
        aliases = canonicalizza_price_lists(lists)

        self.assertEqual(lists[0].canonical_id, "prezzi_base")
        self.assertEqual(lists[0].priority, 2)
        self.assertEqual(lists[1].canonical_id, "prezzi_base")
        self.assertEqual(lists[1].priority, 1)
        self.assertTrue(lists[2].preferred)
        self.assertEqual(aliases["base"], "prezzi_base")
        self.assertEqual(aliases["Progetto-Default"], "listino_progetto")
        self.assertEqual(aliases["listino_progetto"], "listino_progetto")

    def test_build_wbs_path_with_fallback(self) -> None:
        rilevazione = RawRilevazione(
            idx=1,
            prodotto_id="P1",
            progressivo=5,
            wbs_spatial=[
                RawGroupValue(grp_id="G1", code="A01", description="Zona A", kind="spatial", level=1)
            ],
        )
        product = RawProduct(
            prodotto_id="P1",
            code="PRD.001",
            desc_short="Voce",
            wbs7_code="W7",
            wbs7_description="Livello 7",
        )

        path = build_wbs_path(rilevazione, product)

        self.assertEqual(path[0], (1, "A01", "Zona A"))
        self.assertEqual(path[1][0], 6)
        self.assertEqual(path[1][1], "PRD001")
        self.assertEqual(path[2], (7, "W7", "Livello 7"))

    def test_compute_quantity_direct_sums_values(self) -> None:
        measures = [
            RawMeasurement(operation="+", product=Decimal("5")),
            RawMeasurement(operation="+", product=Decimal("0.05")),
            RawMeasurement(operation="-", product=Decimal("1"), references=[10]),
        ]
        self.assertEqual(compute_quantity_direct(measures), Decimal("5.05"))

        multiplied = [
            RawMeasurement(operation="+", product=Decimal("0.25"), cells=[(1, "5*0.05", Decimal("0.25"))])
        ]
        # references intentionally empty to include the row
        self.assertEqual(compute_quantity_direct(multiplied), Decimal("0.25"))

    def test_resolve_progressivo_quantities(self) -> None:
        rilevazioni = [
            RawRilevazione(idx=1, prodotto_id="P1", progressivo=8, quantity_direct=Decimal("2")),
            RawRilevazione(
                idx=2,
                prodotto_id="P1",
                progressivo=10,
                quantity_direct=Decimal("1"),
                reference_entries=[(8, Decimal("1"))],
            ),
            RawRilevazione(
                idx=3,
                prodotto_id="P1",
                progressivo=12,
                quantity_direct=Decimal("0.5"),
                reference_entries=[(10, Decimal("2"))],
            ),
        ]

        resolve_progressivo_quantities(rilevazioni)

        self.assertEqual(rilevazioni[0].quantity_total_resolved, Decimal("2"))
        self.assertEqual(rilevazioni[1].quantity_total_resolved, Decimal("3"))
        self.assertEqual(rilevazioni[2].quantity_total_resolved, Decimal("6.5"))

    def test_resolve_progressivo_quantities_detects_cycles(self) -> None:
        cyclic = [
            RawRilevazione(
                idx=1,
                prodotto_id="P1",
                progressivo=20,
                quantity_direct=Decimal("1"),
                reference_entries=[(21, Decimal("1"))],
            ),
            RawRilevazione(
                idx=2,
                prodotto_id="P1",
                progressivo=21,
                quantity_direct=Decimal("1"),
                reference_entries=[(20, Decimal("1"))],
            ),
        ]

        with self.assertRaises(ValueError):
            resolve_progressivo_quantities(cyclic)


if __name__ == "__main__":
    unittest.main()
