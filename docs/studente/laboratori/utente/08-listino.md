# 08 — Listino

Il **Listino** è la vista “per prodotto/voce” che ti permette di raggruppare e sommare quantità/importi a livello di **Price List Item** (PLI).

In parole semplici:

- il **Dettaglio voci** mostra “righe di computo/offerta”
- il **Listino** mostra “voci di listino” con totale quantità e totale importo

## 8.1 — A cosa serve

Usa il listino per:

- vedere rapidamente quali voci “pesano di più” in termini di importo;
- raggruppare e filtrare per **WBS6/WBS7** (categorie);
- confrontare una offerta anche quando è stata importata in LX (aggregata).

## 8.2 — Come funziona (concetto base)

Per ogni voce di listino, Taboolo può calcolare:

- **Prezzo unitario** (del listino)
- **Quantità totale** (somma delle quantità delle righe che referenziano quella voce)
- **Importo totale** (somma quantità × prezzo o importi già calcolati)

## 8.3 — Baseline vs “vista offerta”

Il listino può essere visto in due modi:

### Listino baseline (progetto)

Mostra i totali calcolati sulle voci del computo baseline.

### Listino filtrato per offerta (round/impresa)

Se la pagina viene aperta con filtri **round** e/o **impresa**, i totali vengono calcolati sulle righe dell’offerta.

Questo è utile quando:

- vuoi vedere l’offerta in forma “lista”, anche se è stata importata in modalità dettagliata;
- vuoi analizzare un round specifico per categorie.

## 8.4 — Filtro WBS e totale

In alto trovi:

- pulsante per mostrare/nascondere la WBS
- badge con filtri attivi
- **Totale** (somma importi delle righe filtrate)

Nel listino, la WBS è tipicamente costruita su **WBS6** e **WBS7**.

## 8.5 — Sezione “Voci da risolvere”

Se hai importato offerte in LX, potresti vedere un riquadro “Voci da risolvere”.

Significa che:

- una o più righe dell’offerta non hanno un match univoco verso un codice di listino;
- Taboolo ti propone dei candidati e chiede una scelta.

Per la procedura completa: `docs/studente/laboratori/utente/09-risoluzione-ambiguita.md`.
