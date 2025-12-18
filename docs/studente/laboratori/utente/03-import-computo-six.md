# 03 — Import computo (SIX/XML)

Questo è lo step fondamentale: importare il **computo di progetto** che diventerà la **baseline**.

## 3.1 — Cosa viene importato (in pratica)

Quando importi un file `.six` o `.xml`:

- viene creato/aggiornato un **preventivo di progetto** (baseline);
- vengono importate le **voci del computo** (quantità, descrizioni, collegamenti);
- vengono importate e ricostruite:
  - **WBS** (albero)
  - **Listino** (voci con codice/descrizione/prezzo) associato al preventivo.

In termini “da utente”, dopo l’import dovresti poter:

- aprire il preventivo → vedere le voci in “Dettaglio Preventivo”;
- aprire il listino → vedere le voci e i totali;
- usare il filtro WBS in varie pagine.

## 3.2 — Dove si fa l’import

Dentro un progetto:

1) Clicca **Importa Dati**
2) Tab “Import Computo (SIX/XML)”
3) Carica il file trascinandolo o selezionandolo

## 3.3 — Preview e scelta del preventivo

Molti file SIX/XML possono contenere più “preventivi” o più sezioni esportate.
Taboolo esegue prima una **preview**:

- analizza il file;
- mostra l’elenco dei preventivi trovati (con descrizione/codice e numero voci).

Se ne vedi più di uno:

1) apri il menu di selezione
2) scegli quello che ti interessa (di solito quello “principale” del progetto)
3) conferma import

Se il file contiene **un solo preventivo**, Taboolo può selezionarlo automaticamente.

## 3.4 — Conferma import e tempi

Dopo “Conferma Importazione” vedrai una barra di avanzamento.
I tempi dipendono da:

- dimensione del file;
- numero di voci;
- eventuale complessità WBS.

## 3.5 — Cosa controllare dopo l’import

Checklist rapida:

1) Nel progetto, compare un preventivo nella lista
2) Aprendo il preventivo:
   - la riga “Preventivo di progetto” ha un totale plausibile
3) Aprendo “Dettaglio Preventivo”:
   - le voci sono presenti
4) Aprendo “Listino”:
   - vedi voci e totali
5) Il filtro WBS mostra nodi (almeno WBS6/WBS7, spesso anche livelli 1–5)

Se uno di questi punti non torna, vai a `docs/studente/laboratori/utente/10-troubleshooting.md`.

## 3.6 — Errori comuni (e prime soluzioni)

### “Errore durante l’analisi del file / preview”

Cause tipiche:

- file corrotto o non valido;
- il servizio di import (Python) non è raggiungibile;
- timeout.

Azioni:

1) riprova con lo stesso file (a volte è un problema temporaneo)
2) prova a esportare nuovamente il file da STR Vision
3) se l’errore persiste, segnala al team tecnico (vedi troubleshooting).

### “Import completato ma vedo poche voci / totali strani”

Cause tipiche:

- hai selezionato un preventivo diverso da quello atteso;
- il file contiene più sezioni e stai importando quella “sbagliata”;
- alcune voci non hanno quantità/prezzo coerenti.

Azioni:

- ripeti l’import selezionando il preventivo corretto;
- confronta numero voci preview vs voci importate.
