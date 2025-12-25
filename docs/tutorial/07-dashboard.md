# 07 — Dashboard e Griglia: visualizzare e filtrare i dati

Questo capitolo spiega come navigare le dashboard e usare le griglie dati.

**Tempo stimato:** 15-20 minuti

---

## La dashboard progetto

Dopo aver importato computo e offerte, la dashboard progetto mostra:

- **Riassunto progetto** — nome, codice, stato
- **Preventivi** — baseline e eventuali versioni
- **Offerte** — per round e impresa
- **Totali** — aggregazioni per WBS

---

## La griglia dati (AG Grid)

Le pagine principali usano **AG Grid** per mostrare i dati:

### Funzionalità base

| Funzione | Come usarla |
|----------|-------------|
| **Ordinamento** | Click su intestazione colonna |
| **Filtro** | Click su icona filtro nella colonna |
| **Ricerca rapida** | Barra di ricerca sopra la griglia |
| **Export** | Pulsante "Esporta CSV" (se presente) |

### Filtro WBS (sidebar)

La sidebar a sinistra mostra l'**albero WBS**:

- Click su un nodo → filtra per quel ramo
- Click sulla radice → mostra tutto
- I totali si aggiornano in base al filtro

---

## Pagine principali

| Pagina | Cosa mostra |
|--------|-------------|
| **Dettaglio Preventivo** | Righe baseline con quantità/prezzi |
| **Dettaglio Offerta** | Righe offerta (filtrate per round/impresa) |
| **Listino** | Voci del listino con prezzi |
| **Confronto** | Colonne affiancate per impresa |

---

## Prossimo capitolo

[08 — Analytics: UMAP, clustering e analisi prezzi](08-analytics.md)
