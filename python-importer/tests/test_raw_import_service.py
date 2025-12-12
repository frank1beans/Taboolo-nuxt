from decimal import Decimal
import unittest

from services.raw_import_service import SixRawImportService


SIMPLE_XML = b"""
<documento>
  <unitaDiMisura unitaDiMisuraId="m" simbolo="m"/>
  <gruppo tipo="WBS 01">
    <grpValore grpValoreId="G1" vlrId="A01">
      <vlrDescrizione breve="Zona A"/>
    </grpValore>
  </gruppo>
  <listaQuotazione listaQuotazioneId="L1">
    <lqtDescrizione breve="Prezzi Base"/>
  </listaQuotazione>
  <prodotto prodottoId="P1" prdId="P1">
    <prdDescrizione breve="Voce breve"/>
    <prdQuotazione listaQuotazioneId="L1" valore="10"/>
  </prodotto>
  <preventivo preventivoId="PRV1" prvId="C1" prezzarioId="L1">
    <prvDescrizione breve="Preventivo 1"/>
    <prvRilevazione progressivo="1" prodottoId="P1" listaQuotazioneId="L1">
      <prvGrpValore grpValoreId="G1"/>
      <prvMisura operazione="+">
        <prvCella posizione="1" testo="5"/>
      </prvMisura>
    </prvRilevazione>
  </preventivo>
</documento>
"""


class TestSixRawImportService(unittest.TestCase):
    def setUp(self) -> None:
        self.service = SixRawImportService()

    def test_parse_raw_returns_raw_entities(self) -> None:
        result = self.service.parse_raw(file_bytes=SIMPLE_XML, filename="test.xml")

        self.assertEqual(len(result["units"]), 1)
        self.assertGreaterEqual(len(result["price_lists"]), 1)
        self.assertEqual(len(result["groups"]), 1)
        self.assertEqual(len(result["products"]), 1)
        self.assertEqual(len(result["preventivi"]), 1)
        self.assertIn("PRV1", result["rilevazioni"])

        canonical_ids = {pl.canonical_id for pl in result["price_lists"]}
        self.assertIn("prezzi_base", canonical_ids)

        rilevazioni = result["rilevazioni"]["PRV1"]
        self.assertEqual(len(rilevazioni), 1)
        ril = rilevazioni[0]
        self.assertEqual(ril.progressivo, 1)
        self.assertEqual(ril.lista_quotazione_id_raw, "L1")
        self.assertEqual(ril.quantity_direct, Decimal("5.00"))
        self.assertEqual(ril.quantity_total_resolved, Decimal("5.00"))
        self.assertEqual(len(ril.wbs_spatial), 1)
        self.assertEqual(ril.misure[0].product, Decimal("5.00"))
        self.assertEqual(ril.reference_entries, [])

        preventivo_meta = result["preventivi"][0]
        self.assertEqual(preventivo_meta.preventivo_id, "PRV1")
        self.assertEqual(preventivo_meta.price_list_id_raw, "L1")
        self.assertEqual(preventivo_meta.total_importo_preview, 50.0)

    def test_inspect_raw_structure_counts(self) -> None:
        preview = self.service.inspect_raw_structure(file_bytes=SIMPLE_XML, filename="test.xml")

        self.assertEqual(preview["units_count"], 1)
        self.assertEqual(preview["products_count"], 1)
        self.assertEqual(preview["price_lists_count"], 1)
        self.assertEqual(preview["groups_count"], 1)


if __name__ == "__main__":
    unittest.main()
