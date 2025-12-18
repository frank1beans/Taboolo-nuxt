# 07 — Confronto offerte (Round e imprese)

La pagina “Confronto” è la vista più potente per analisi: affianca le imprese in colonne e mostra delta e statistiche.

## 7.1 — Quando usarla

Usa il confronto quando vuoi:

- capire **quale impresa è più competitiva** su una categoria (WBS);
- individuare **voci critiche** (delta prezzo alto);
- confrontare un **round specifico** (R1 vs R2, ecc.).

## 7.2 — Come arrivarci

Dal preventivo (dashboard):

- clic su “Confronto dettagliato”  
oppure
- apri la pagina “Confronto” dalla navigazione del preventivo.

## 7.3 — Filtri disponibili

In alto trovi:

- **Round**: mostra solo le offerte del round scelto (e aggiorna le colonne imprese)
- **Impresa**: mostra solo l’impresa scelta
- **WBS**: filtro ad albero (sidebar) per limitare le voci a una categoria o ramo

Suggerimento:

> Per una lettura pulita, scegli prima un **round** e poi usa la WBS per scendere nel dettaglio.

## 7.4 — Struttura della tabella

La tabella ha 3 blocchi:

### A) Dati progetto (baseline)

- **Codice**
- **Descrizione**
- **UM**
- **Quantità progetto**
- **Prezzo unitario progetto**
- **Importo progetto**

Questi valori sono il riferimento.

### B) Statistiche

Calcolate sulle offerte visibili:

- **Media prezzi**
- **Minimo prezzi**
- **Massimo prezzi**

### C) Colonne per impresa

Per ogni impresa (e round) visibile, Taboolo crea un gruppo colonne con:

- **Q.tà** (offerta)
- **Δ Q.tà** (offerta - progetto)
- **Prezzo** (offerta)
- **Δ Media** (prezzo offerta - prezzo medio)
- **Δ P.U.** (prezzo offerta - prezzo progetto)
- **Importo** (offerta)
- **Δ Imp.** (importo offerta - importo progetto)

## 7.5 — Come leggere i colori (regola pratica)

I delta sono colorati in modo “intuitivo” per gare al ribasso:

- **verde**: valore **migliore** (tipicamente delta negativo = costa meno del riferimento)
- **rosso**: valore **peggiore** (tipicamente delta positivo = costa di più)

Esempi:

- Δ P.U. = **-3,00 €** → verde → l’impresa è più bassa del progetto su quella voce
- Δ Imp. = **+120,00 €** → rosso → l’impresa è più alta del progetto su quella voce

## 7.6 — Interpretazione pratica (strategie)

### Strategia 1: “Top-down” con WBS

1) seleziona un round (es. R2)
2) nel pannello WBS seleziona una categoria (WBS6)
3) ordina per “Δ Imp.” e trova le voci più impattanti

### Strategia 2: “Anomalie”

Ordina o filtra per:

- Δ P.U. molto grande
- Δ Q.tà molto grande

Spesso individui:

- errori di mapping (colonna prezzo/quantità sbagliata)
- voci con UM o descrizioni ambigue
- extra/varianti (addendum) non agganciate bene

### Strategia 3: confronto tra imprese

Se vuoi un confronto “pulito” tra imprese:

- usa sempre lo stesso round
- assicurati di avere importato offerte comparabili (stessa baseline)

