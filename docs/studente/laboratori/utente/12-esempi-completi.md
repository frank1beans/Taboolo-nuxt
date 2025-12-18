# 12 — Esempi completi (tutorial guidato)

Questo capitolo è un tutorial “dall’inizio alla fine” con un esempio realistico.

> Tutti i nomi (progetto, imprese, file) sono di fantasia: usali come modello.

## Scenario

Hai una commessa con un computo di progetto e due imprese che partecipano alla gara.

- **Progetto**: “Scuola X – Riqualificazione 2025”
- **Baseline**: computo esportato da STR Vision (`.six`)
- **Offerte**:
  - Impresa Rossi (Round 1) → Excel
  - Impresa Bianchi (Round 1) → Excel

Obiettivo:

1) importare la baseline
2) importare entrambe le offerte
3) confrontare le imprese per categoria WBS6
4) risolvere eventuali voci ambigue (pending)

---

## 12.1 — Creazione progetto

1) Vai su **Progetti**
2) Clicca **Nuovo progetto**
3) Compila:
   - Nome: `Scuola X – Riqualificazione 2025`
   - Codice: `SCUOLA-X-2025`
   - Stato: `in_progress` (o `setup` se devi ancora importare)
4) Salva

Controllo: nella tabella progetti deve comparire la riga con il codice appena creato.

---

## 12.2 — Import baseline (computo SIX/XML)

1) Apri il progetto `SCUOLA-X-2025`
2) Clicca **Importa Dati**
3) Nel tab “Import Computo (SIX/XML)”, carica il file:
   - `computo_scuola_x.six`

### 12.2.1 — Preview e selezione preventivo

Dopo pochi secondi Taboolo mostra una lista di preventivi trovati nel file (se > 1).

Esempio:

- “Preventivo Progetto – Rev A” (12.345 voci)
- “Computo Variante” (245 voci)

Scegli sempre il preventivo che rappresenta la baseline ufficiale.

### 12.2.2 — Conferma importazione

Premi **Conferma Importazione** e attendi.

Alla fine dovresti vedere un messaggio di successo con:

- numero voci importate
- numero nodi WBS

### 12.2.3 — Verifica rapida post-import

Torna alla pagina del progetto (lista preventivi).

Checklist:

- compare almeno 1 preventivo
- aprendo il preventivo, la riga “Preventivo di progetto” ha un totale non nullo (o almeno plausibile)

Se il totale è 0:

- apri `Dettaglio Preventivo` e controlla quantità/prezzi
- apri `Listino` e controlla la colonna “Prezzo Unit.”

---

## 12.3 — Import Offerta 1 (Impresa Rossi, Round 1)

1) Nel progetto, vai in **Importa Dati**
2) Tab “Import Offerta (Excel)”

### 12.3.1 — Step “Configurazione”

- Baseline: seleziona “Preventivo Progetto – Rev A” (o il nome della baseline importata)
- Modalità:
  - se l’Excel contiene righe simili al listino → **LX**
  - se l’Excel è riga-per-riga col progressivo del computo → **MX**

Per il tutorial, scegliamo **LX**.

### 12.3.2 — Step “File”

Carica:

- `offerta_rossi_round1.xlsx`

Poi compila:

- Impresa: `Impresa Rossi`
- Round: `1`
- Foglio: seleziona quello che contiene la tabella (es. `Offerta`)

### 12.3.3 — Step “Mappatura”

Taboolo ti mostra le colonne disponibili. Mappa i campi:

- Codice → (es. colonna `Codice` o `Cod.`)
- Descrizione → (es. colonna `Descrizione`)
- Prezzo → (es. `Prezzo` / `Importo unitario`)
- Quantità → (es. `Qta` / `Quantità`)

Avvia import.

### 12.3.4 — Verifica nella dashboard preventivo

Apri il preventivo e controlla:

- compare una nuova riga offerta (Impresa Rossi, Round 1)
- Δ Importo e Δ % sono valorizzati

Apri “Dettaglio Offerta” dalla riga:

- deve mostrarti voci e totale.

---

## 12.4 — Import Offerta 2 (Impresa Bianchi, Round 1)

Ripeti lo stesso processo per:

- `offerta_bianchi_round1.xlsx`
- Impresa: `Impresa Bianchi`
- Round: `1`

---

## 12.5 — Confronto (Round e imprese)

Apri “Confronto dettagliato”.

### 12.5.1 — Filtra il round

Seleziona **Round 1** dal filtro.

Controllo:

- nella tabella compaiono colonne per `Impresa Rossi` e `Impresa Bianchi`.

### 12.5.2 — Usa WBS6 per raggruppare mentalmente

Apri il pannello WBS e seleziona una categoria WBS6 (es. “Impianti elettrici”).

Ora:

- il totale delle righe (e la tabella) è limitato alla categoria selezionata
- puoi ordinare per “Δ Imp.” per trovare le voci più impattanti

### 12.5.3 — Cosa cercare

Per ogni impresa, controlla:

- Δ P.U.: differenza prezzo unitario vs progetto
- Δ Imp.: differenza importo vs progetto

Ricorda:

- Δ negativo (verde) = offerta più bassa del progetto
- Δ positivo (rosso) = offerta più alta del progetto

---

## 12.6 — Pending: risolvi le ambiguità (se presenti)

Se in LX alcune voci non si agganciano in modo univoco, Taboolo le segna come **pending**.

1) Vai su **Listino**
2) Cerca il riquadro “Voci da risolvere”
3) Per ogni voce:
   - seleziona il candidato corretto
   - clicca “Abbina”

Dopo la risoluzione:

- listino e confronto diventano più coerenti
- diminuisce il rischio di “voci spostate” su categorie errate

---

## 12.7 — Checklist finale (prima di presentare i risultati)

- [ ] Baseline presente, totale plausibile
- [ ] Offerte importate con impresa e round corretti
- [ ] Confronto round 1 mostra tutte le imprese attese
- [ ] Pending risolte (o motivate)
- [ ] Analisi per WBS6 completata (categorie principali)

