import asyncio
import os
import json
from embedding.extraction.llm_extractor import LLMExtractor
from embedding.extraction.schemas.cartongesso import CartongessoProperties

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
IMPORTER_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))

DESCRIPTION = """C09 - Fornitura e posa di parete in cartongesso standard/lastra rinforzata e rivestimento fonoisolante con mono orditura metallica da 50 mm, avente le seguenti caratteristiche:

C09 - altezza da pavimento sopraelevato a controsoffitto h. 270cm

composta da:

- Orditura metallica in acciaio zincato da 50 mm, con passo dei montanti di 60cm
- Lastra in cartongesso per l'antincendio e locali umidi tipo "Knauf Diamant" o similare a scelta della DL. Sp. 12,5 mm
- Lastra in cartongesso standard tipo "Knauf GKB" o similare a scelta della DL. Sp. 12,5 mm 
- Strato isolante acustico in lamina sintetica viscoelastica tipo "Tecsound 35" o similare a scelta della DL. Sp. 2 mm, densità 4 Kg/m2
- Strato isolante in lana minerale tipo "Isover Arena 31" A1 o similare a scelta della DL. Sp. 40 mm, densità 30-60 Kg/mc. 
- Lastra in cartongesso standard tipo "Knauf GKB" o similare a scelta della DL. Sp. 12,5 mm 
- Lastra in cartongesso per l'antincendio e locali umidi tipo "Knauf Diamant" o similare a scelta della DL. Sp. 12,5 mm

Nel prezzo si intendono compresi e compensati gli oneri per, il taglio e lo sfrido, i paraspigoli, la formazione di vani per porte completi di rinforzo perimetrale in profilati metallici per l'ancoraggio del serramento, rispettando normativa CE."""

async def run_test():
    extractor = LLMExtractor(provider="mistral", model="mistral-large-latest", max_retries=2)
    
    schema_model = CartongessoProperties()
    schema_template = {}
    for field in schema_model.__fields__:
        schema_template[field] = {"value": None, "evidence": None, "confidence": 0.0}
    
    print("Extracting from complex item C09...")
    result = extractor.extract(
        description=DESCRIPTION,
        schema=schema_template,
        family="cartongesso"
    )
    
    # Save to file for easy inspection
    output_dir = os.path.join(IMPORTER_DIR, "embedding", "extraction")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "c09_extraction_result.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    print(f"Result saved to: {output_path}")

if __name__ == "__main__":
    asyncio.run(run_test())

