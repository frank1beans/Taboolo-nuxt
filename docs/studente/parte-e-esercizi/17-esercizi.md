# 17 - Esercizi (stile corso universitario)

Questa sezione è una lista di esercizi/progetti da fare dopo aver letto i capitoli.
L'obiettivo è imparare costruendo: ogni esercizio ha un "perché" e un risultato verificabile.

Consiglio pratico:

- crea un branch per ogni esercizio (`studio/esercizio-xx`)
- fai commit piccoli
- scrivi sempre una nota: "cosa ho cambiato e perché"

## 17.1 - Warm-up (fondamentali)

### Esercizio 1: endpoint `GET /api/ping`

- capitolo: `docs/studente/parte-b-backend/07-nitro-h3-endpoints.md`
- obiettivo: aggiungere un endpoint semplice
- verifica: apri `/api/ping` e ottieni `{ ok: true, time: "..." }`

### Esercizio 2: normalizzazione numeri robusta

- capitolo: `docs/studente/parte-a-basi/02-fondamenti-js-ts.md`
- obiettivo: scrivere una funzione `unknown -> number | null`
- verifica: gestisce `123`, `"123"`, `"123,45"`, `"  10  "`, e rifiuta input non numerici

### Esercizio 3: Counter component (Vue)

- capitolo: `docs/studente/parte-a-basi/03-fondamenti-vue3.md`
- obiettivo: props + emits + reattività
- verifica: il parent riceve `update:value` e la UI si aggiorna

## 17.2 - Intermedio (frontend)

### Esercizio 4: aggiungi una colonna alla griglia voci

- capitolo: `docs/studente/parte-c-dominio-feature/11-pagine-data-grid-wbs.md`
- obiettivo: modificare una config griglia senza rompere il resto
- verifica:
  - colonna visibile
  - sorting funziona
  - filtro funziona

### Esercizio 5: badge "righe filtrate / righe totali"

- capitolo: `docs/studente/parte-c-dominio-feature/11-pagine-data-grid-wbs.md`
- obiettivo: rendere i filtri "osservabili" (UX)
- verifica: badge si aggiorna quando cambi filtro o selezioni nodo WBS

### Esercizio 6: migliorare il wizard import (UX)

- capitolo: `docs/studente/parte-d-approfondimenti/20-upload-file-excel-e-wizard.md`
- obiettivo: rendere più chiaro un errore comune (foglio sbagliato o colonne mancanti)
- verifica: messaggio esplicito + indicazione su cosa fare

## 17.3 - Intermedio (backend + Mongo)

### Esercizio 7: `GET /api/projects/count`

- capitolo: `docs/studente/parte-b-backend/07-nitro-h3-endpoints.md`
- obiettivo: endpoint semplice con query su Mongo
- verifica: ritorna un numero coerente con la lista progetti

### Esercizio 8: paginazione reale progetti

- capitolo: `docs/studente/parte-c-dominio-feature/12-costruire-feature-progetti.md`
- obiettivo: usare davvero `page` e `totalPages` in UI
- verifica: cambi pagina e vedi set diversi di righe

### Esercizio 9: migliorare la delete cascade

- capitolo: `docs/studente/parte-c-dominio-feature/12-costruire-feature-progetti.md`
- obiettivo: rendere la delete più affidabile o più veloce
- esempi:
  - parallelizzare alcune delete (dove sicuro)
  - aggiungere log di progress (quante estimate eliminate)
- verifica: delete di un progetto "pieno" non lascia dati orfani

## 17.4 - Avanzato (import)

### Esercizio 10: distinguere errore Python vs DB vs mapping

- capitolo: `docs/studente/parte-c-dominio-feature/10-importer-python.md`
- obiettivo: diagnosi rapida
- idea:
  - includere `phase` nei `createError`
  - mostrare `phase` e dettagli in UI
- verifica: quando "spezzi" uno dei tre layer, la UI ti dice quale

### Esercizio 11: pending resolution guidata

- capitolo: `docs/studente/parte-c-dominio-feature/09-dominio-taboolo-data.md`
- obiettivo: rendere più veloce risolvere pending
- idea:
  - ordinare candidati per score/heuristica (se disponibile)
  - aggiungere search dentro i candidati
- verifica: riduci click medi per risolvere una pending

### Esercizio 12: import batch (multi-company)

- capitolo: `docs/studente/parte-d-approfondimenti/20-upload-file-excel-e-wizard.md`
- obiettivo: importare più imprese/round da un solo file
- verifica: si creano più `Offer` e `OfferItem` con round/company corretti

## 17.5 - Avanzato (listino + confronto)

### Esercizio 13: nuova metrica nel confronto

- capitolo: `docs/studente/parte-c-dominio-feature/14-costruire-feature-confronto-listino.md`
- obiettivo: aggiungere una metrica senza rompere colonne dinamiche
- esempio:
  - delta vs media (se non presente) o un badge competitività
- verifica: metrica coerente e stile coerente

### Esercizio 14: filtro UM nel listino

- capitolo: `docs/studente/parte-c-dominio-feature/14-costruire-feature-confronto-listino.md`
- obiettivo: filtro per unità di misura
- verifica: listino filtra e totale cambia coerentemente

## 17.6 - Capstone (progetto finale)

Titolo: "Da import a report"

Obiettivo:

1) import baseline + 2 offerte (round 1)
2) risolvi pending
3) genera un export (CSV/Excel) di un confronto filtrato per WBS6
4) documenta decisioni e trade-off (tecnico e UX)

Deliverable:

- un file export prodotto dalla UI
- una nota tecnica (1-2 pagine) che spiega:
  - dove hai implementato l'export
  - come hai gestito pending e filtri
  - quali compromessi hai scelto (performance vs precisione)

Se completi il capstone, non sei più "studente": sei pronto a mantenere ed evolvere Taboolo.
