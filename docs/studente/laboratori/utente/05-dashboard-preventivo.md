# 05 — Dashboard preventivo

La dashboard del preventivo è il “cruscotto” dove vedi:

- il totale del progetto (baseline)
- tutte le offerte (per impresa e round)
- le azioni principali: aprire dettaglio, confronto, modificare o eliminare offerte

## 5.1 — Cosa vedo nella tabella principale

La tabella unifica baseline e offerte:

- **Preventivo di progetto** (baseline): una riga “fissa” con importo di riferimento
- **Offerte**: una riga per ogni combinazione impresa/round (in base ai dati importati)

Campi tipici:

- **Round**: “R1”, “R2”, …
- **Impresa**
- **Stato**: bozza/inviata/accettata/rifiutata (quando gestito)
- **Importo**: totale offerta
- **Δ Importo**: differenza rispetto al totale baseline
- **Δ %**: differenza percentuale rispetto al baseline

Suggerimento:

> Il confronto ha senso se il totale baseline è credibile. Se è 0 o palesemente errato, verifica prima l’import del computo.

## 5.2 — “Migliore offerta”

Taboolo evidenzia come “migliore” l’offerta con **importo totale più basso** tra quelle disponibili.

Nota: l’interpretazione “migliore = più basso” è coerente con scenari di gara al ribasso.
Se nel tuo contesto “migliore” significa altro, segnalalo al team (è una regola di business).

## 5.3 — Azioni disponibili sulle offerte

Sulle righe offerta (non sulla baseline) puoi:

- **Aprire il dettaglio offerta**: apre la vista voci filtrata per round/impresa
- **Modificare** metadati (nome, impresa, round, stato, totale)
- **Eliminare** offerta e voci collegate

Consiglio: prima di eliminare una offerta, assicurati che non sia l’unica del round (per non perdere lo storico).

## 5.4 — Pulsante “Confronto dettagliato”

Dalla dashboard puoi andare direttamente alla pagina di confronto, dove:

- le colonne delle imprese sono affiancate
- vedi delta per quantità/prezzo/importo
- puoi filtrare per round/impresa e WBS

Dettagli: `docs/studente/laboratori/utente/07-confronto-offerte.md`.
