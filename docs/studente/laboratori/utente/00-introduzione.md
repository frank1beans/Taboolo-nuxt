# 00 — Introduzione

Taboolo è un’applicazione per **gestire preventivi di progetto** e **ritorni di gara (offerte)**, con l’obiettivo di:

- importare un **computo di progetto** (baseline) da file **SIX/XML**;
- importare una o più **offerte** (per impresa e round) da file **Excel**;
- confrontare le offerte rispetto al progetto (delta prezzi/importi, migliori offerte, analisi per WBS).

Questa guida è pensata per **chi parte da zero**: troverai definizioni, procedure e consigli pratici.

## 0.1 — Cosa significa “baseline”, “preventivo”, “offerta”

In Taboolo:

- **Progetto (commessa)**: contenitore principale. Esempio: “Ristrutturazione scuola X”.
- **Preventivo (Estimate)**: un documento associato al progetto.
  - Il **preventivo di progetto** è la **baseline** (tipo `project`): è il riferimento.
  - Le **offerte** sono gestite come ritorni collegati alla baseline (nei dati sono `Offer`/`OfferItem`).
- **Round**: una tornata di gara (1, 2, 3…). In ogni round puoi avere una o più imprese.

Regola importante:

> Prima importa (o crea) il **preventivo di progetto (baseline)**, poi importa le **offerte**.

## 0.2 — WBS in parole semplici

La **WBS** è una struttura a livelli (albero) che permette di raggruppare le voci.
In questa versione del progetto:

- livelli **1–5**: WBS “spaziale” (aree/zone/parti dell’opera);
- livelli **6–7**: WBS “commodity” (categorie di lavorazioni/beni).

Nelle schermate troverai spesso un **pannello WBS**: selezionare un nodo significa filtrare e sommare solo le voci in quel ramo.

## 0.3 — Cosa vedrai nell’interfaccia

Le pagine principali sono costruite su una tabella (Data Grid) con:

- **ricerca veloce** (barra filtro);
- **ordinamento** e **colonne**;
- **azioni di riga** (aprire / modificare / eliminare);
- **export** (quando disponibile).

Molte viste mostrano anche:

- **totale** (somma importi delle righe filtrate);
- filtri contestuali (es. **round** e **impresa**);
- indicatori (es. “migliore offerta”).

## 0.4 — Percorso consigliato di studio

Se vuoi imparare velocemente:

1) `docs/studente/laboratori/utente/01-primi-passi.md` (workflow completo, una prima volta)
2) `docs/studente/laboratori/utente/03-import-computo-six.md` (baseline)
3) `docs/studente/laboratori/utente/04-import-offerte-excel.md` (offerte)
4) `docs/studente/laboratori/utente/07-confronto-offerte.md` (analisi)
5) `docs/studente/laboratori/utente/09-risoluzione-ambiguita.md` (quando qualcosa non “si aggancia”)

Se ti blocchi: `docs/studente/laboratori/utente/10-troubleshooting.md`.
