from decimal import Decimal
import unittest

from importers.models.raw import (
    RawGroupValue,
    RawMeasurement,
    RawPreventivoMetadata,
    RawPriceList,
    RawProduct,
    RawRilevazione,
    RawLxItem,
    RawMxReturn,
    RawUnit,
)


class TestRawModels(unittest.TestCase):
    def test_raw_unit_and_group_value_creation(self) -> None:
        unit = RawUnit(unit_id="m", label="Metro")
        group = RawGroupValue(
            grp_id="G1",
            code="001",
            description="Livello 1",
            kind="spatial",
            level=1,
        )
        self.assertEqual(unit.unit_id, "m")
        self.assertEqual(unit.label, "Metro")
        self.assertEqual(group.kind, "spatial")
        self.assertEqual(group.level, 1)

    def test_price_list_canonical_fallback(self) -> None:
        price_list = RawPriceList(
            list_id_raw="LISTA-RAW",
            canonical_id="",
            label="Prezzi Base",
            priority=2,
        )
        self.assertEqual(price_list.canonical_id, "LISTA-RAW")
        self.assertEqual(price_list.priority, 2)
        self.assertFalse(price_list.preferred)

    def test_product_desc_short_fallback_and_prices(self) -> None:
        product = RawProduct(
            prodotto_id="P-001",
            code="A01.02",
            desc_short="",
            desc_long=None,
            unit_id="m2",
            wbs6_code="WBS6",
            wbs6_description="Livello 6",
            wbs7_code=None,
            wbs7_description=None,
            is_parent_voice=True,
            prices=[("prezzi_base", 15.5, 2)],
        )
        self.assertEqual(product.desc_short, "A01.02")
        self.assertEqual(product.prices, [("prezzi_base", 15.5, 2)])
        self.assertTrue(product.is_parent_voice)

    def test_measurement_normalizes_operation(self) -> None:
        measurement = RawMeasurement(
            operation="",
            cells=[(1, "2*3", Decimal("6"))],
            product=Decimal("6"),
            references=[5, 7],
        )
        self.assertEqual(measurement.operation, "+")
        self.assertEqual(measurement.cells[0][2], Decimal("6"))
        self.assertEqual(measurement.references, [5, 7])

    def test_rilevazione_defaults_and_links(self) -> None:
        measurement = RawMeasurement(cells=[(1, "1", Decimal("1"))], product=Decimal("1"))
        rilevazione = RawRilevazione(
            idx=1,
            prodotto_id="P-001",
            progressivo=10,
            lista_quotazione_id_raw="RAW",
            wbs_spatial=[
                RawGroupValue(grp_id="G1", code="001", description=None, kind="spatial", level=1)
            ],
            misure=[measurement],
            comments=["nota"],
            quantity_direct=Decimal("1"),
            reference_entries=[(5, Decimal("0.5"))],
        )
        self.assertEqual(rilevazione.comments, ["nota"])
        self.assertEqual(rilevazione.misure[0].product, Decimal("1"))
        self.assertIsNone(rilevazione.quantity_total_resolved)
        self.assertEqual(rilevazione.reference_entries, [(5, Decimal("0.5"))])

    def test_preventivo_metadata_basic(self) -> None:
        metadata = RawPreventivoMetadata(
            preventivo_id="PRV1",
            code="C-01",
            description="Preventivo di prova",
            price_list_id_raw="PL1",
            rilevazioni=2,
            items=1,
            total_importo_preview=123.45,
        )
        self.assertEqual(metadata.preventivo_id, "PRV1")
        self.assertEqual(metadata.total_importo_preview, 123.45)

    def test_raw_lx_item_and_mx_return_defaults(self) -> None:
        lx = RawLxItem(code="A01", description="desc", price=10.0, quantity=2.0)
        self.assertEqual(lx.tokens, None)
        self.assertIsNone(lx.product_id)
        mx = RawMxReturn(
            progressive=5,
            code="A01",
            description=None,
            price=1.0,
            quantity=3.0,
            tokens=["a01"],
            rilevazione_id=None,
        )
        self.assertEqual(mx.tokens, ["a01"])
        self.assertIsNone(mx.product_id)


if __name__ == "__main__":
    unittest.main()
