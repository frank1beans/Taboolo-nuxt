# 06 — Dettaglio voci

Taboolo offre due viste simili (stesso layout), ma con contenuti diversi:

- **Dettaglio Preventivo**: le voci del computo baseline
- **Dettaglio Offerta**: le voci dell’offerta (filtrate per round e impresa)

## 6.1 — Dettaglio Preventivo (baseline)

Qui vedi le righe del computo di progetto, con:

- progressivo (se disponibile)
- codice e descrizione
- unità di misura
- quantità, prezzo unitario, importo

Il totale mostrato in alto è la somma delle righe **dopo filtri e WBS**.

## 6.2 — Dettaglio Offerta (round/impresa)

Quando apri una offerta dalla dashboard, Taboolo passa automaticamente i filtri (round e impresa).

In questa vista:

- le righe possono provenire da:
  - match “dettagliato” (MX) su riga baseline
  - match “aggregato” (LX) su voce di listino
- quantità e prezzo sono quelli dell’offerta
- l’importo è calcolato come quantità × prezzo (se non già presente)

## 6.3 — Ricerca e filtri

In alto trovi una barra di ricerca rapida (filtra le righe visibili).

Consigli:

- cerca per **codice**
- cerca per parola chiave in **descrizione**

## 6.4 — Pannello WBS (filtro ad albero)

Aprendo il pannello WBS puoi:

- filtrare per un nodo specifico (es. una categoria WBS6)
- restringere il perimetro e vedere il totale “di quel ramo”

Come interpretare:

- livelli 1–5: aree/spazi (se presenti)
- livelli 6–7: categorie (quasi sempre presenti per listino)

Nota: in alcune viste (es. listino o confronto) la WBS è costruita usando WBS6/WBS7.

