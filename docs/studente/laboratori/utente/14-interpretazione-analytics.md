# 14 — Interpretazione dei numeri (delta, statistiche, trend)

Questo capitolo spiega come interpretare i principali numeri che Taboolo mostra oggi (e quelli esposti dalle API analytics).

## 14.1 — Totale progetto (baseline)

È la somma delle voci del computo baseline.

È il riferimento per:

- Δ Importo
- Δ %

Se il totale progetto è 0 o non plausibile:

- prima di analizzare le offerte, verifica l’import del computo e del listino.

## 14.2 — Totale offerta

Nella dashboard, l’importo offerta può derivare da:

- totale dichiarato dall’import (se presente)
- calcolo delle righe (quantità × prezzo) in alcune viste

Se ti serve una coerenza assoluta, confronta:

- importo in testata offerta (dashboard)
- importo derivato dalle righe nel dettaglio/listino

## 14.3 — Delta importo e delta %

Definizioni:

- **Δ Importo** = Totale Offerta − Totale Progetto
- **Δ %** = (Δ Importo / Totale Progetto) × 100

Interpretazione “gara al ribasso”:

- Δ negativo → offerta più economica (in genere “meglio”)
- Δ positivo → offerta più cara

## 14.4 — Media / Min / Max prezzi (Confronto)

Nella vista Confronto:

- **Media**: media dei prezzi unitari offerti (sulle imprese visibili)
- **Min/Max**: estremi dei prezzi unitari offerti

Usali per identificare:

- outlier (un’impresa molto più alta o più bassa)
- possibili errori di mapping (prezzo letto dalla colonna sbagliata)

## 14.5 — Trend per round (API)

Le API espongono anche un trend per round:

- totale per impresa e round
- media del round

Questo è utile per rispondere a domande tipo:

- “I prezzi stanno scendendo tra round 1 e round 2?”
- “Quali imprese migliorano davvero?”

Nota: la UI può integrare questi grafici in un secondo momento; intanto le API sono disponibili (`/api/projects/:id/analytics/trend`).

