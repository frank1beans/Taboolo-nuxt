# 09 — Risoluzione ambiguità (pending)

Questo capitolo spiega cosa significa **pending** e come risolverlo.

## 9.1 — Cos’è una voce “pending”

Una voce offerta è “pending” quando Taboolo **non riesce ad agganciarla** in modo univoco al listino (Price List Item).

Capita soprattutto in modalità **LX (aggregata)** quando:

- un codice non è presente o è vuoto;
- la descrizione dell’Excel combacia con più voci simili nel listino;
- il listino contiene duplicati o descrizioni troppo vicine.

Risultato:

- Taboolo salva la riga come “da risolvere”
- propone un elenco di “candidati” (possibili codici di listino)

## 9.2 — Perché è importante risolvere

Finché una voce è pending:

- i totali per listino/categorie possono essere incompleti o spostati;
- il confronto tra imprese può essere meno accurato;
- alcune righe restano in una zona “non classificata”.

## 9.3 — Dove si risolve

Vai nella pagina **Listino** del progetto (sul preventivo corretto).

In alto, se ci sono voci pending, vedrai la sezione:

> “Voci da risolvere”

## 9.4 — Come si risolve (procedura)

Per ogni voce pending:

1) leggi descrizione, quantità e prezzo (sono quelli importati dall’offerta)
2) apri il menu “Seleziona codice”
3) scegli il candidato corretto (codice + descrizione + UM)
4) clicca **Abbina**

Dopo “Abbina”:

- la voce viene marcata come risolta
- i totali e le viste si aggiornano

## 9.5 — Come evitare pending (best practice)

Se puoi intervenire sul dato di origine:

- in Excel, preferisci sempre un **codice univoco** (non solo descrizione)
- evita descrizioni generiche (“tubi”, “manodopera”, “varie”)
- quando esporti/importi listini, verifica che i codici non siano duplicati

Se invece il problema è inevitabile:

- risolvi le pending dopo ogni import (ci metti poco e “bonifichi” l’analisi)

