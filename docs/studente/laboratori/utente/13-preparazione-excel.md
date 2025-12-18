# 13 — Preparazione dei file Excel (best practice)

Questo capitolo ti aiuta a preparare un Excel “a prova di import”.

> L’import Excel dipende dalla qualità del dato: un file pulito riduce errori, pending e addendum.

## 13.1 — Struttura consigliata del foglio

Taboolo funziona meglio quando:

- c’è una sola tabella “continua” (righe consecutive)
- c’è una riga di intestazione chiara (header)
- non ci sono celle unite (merge) sopra la tabella

Esempio di intestazioni consigliate:

| Codice | Descrizione | UM | Quantità | Prezzo |
|---|---|---:|---:|---:|

## 13.2 — Quali colonne servono davvero

Minimo indispensabile:

- **Prezzo** (unitario)
- **Quantità**
- almeno uno tra:
  - **Codice**
  - **Descrizione**

Per la modalità MX (dettagliata), consigliato:

- **Progressivo** (o Numero riga)

## 13.3 — Nomi colonna e auto-rilevamento

Il wizard prova a riconoscere automaticamente le colonne.
Riconosce pattern tipici (semplificato):

- codice: contiene `cod`, `art` oppure è `n.` / `n`
- descrizione: contiene `desc`, `voce`, `lavor`
- prezzo: contiene `prezzo`, `price`, `importo`
- quantità: contiene `quant`, `qta`, `qty`
- progressivo: contiene `prog`, `num`

Consiglio:

> Se puoi scegliere, usa intestazioni chiare come `Codice`, `Descrizione`, `Quantità`, `Prezzo`.

## 13.4 — Dati numerici: attenzione a formati e separatori

Taboolo usa ExcelJS/XLSX per leggere il file.
Per evitare problemi:

- evita prezzi come testo con simboli (es. `€ 12,50` come stringa)
- preferisci numeri “puliti”
- se devi usare il simbolo, assicurati che Excel lo consideri formato numerico (non testo)

## 13.5 — Casi comuni che creano problemi

### Intestazione su più righe

Se hai intestazioni su 2 righe (es. “Prezzo” sopra e “Unitario” sotto), il rilevamento può scegliere la riga sbagliata.

Soluzione:

- crea una sola riga header
- oppure sposta la tabella in un foglio “pulito”

### Celle unite / titoli sopra la tabella

Se ci sono molte righe “titolo” sopra, Taboolo può rilevare l’header in ritardo o in anticipo.

Soluzione:

- lascia 1–2 righe vuote e poi header
- evita tabelle con blocchi sparsi

### Codici non univoci o mancanti

In modalità LX, codici mancanti o descrizioni generiche aumentano le ambiguità (pending).

Soluzione:

- compila sempre il codice se disponibile
- usa descrizioni più specifiche

## 13.6 — Come scegliere LX o MX (regola pratica)

Scegli **LX** se:

- l’Excel ha voci “raggruppate” (non per riga computo)
- non hai progressivo coerente con baseline

Scegli **MX** se:

- l’Excel è un “computo di ritorno”
- hai progressivo stabile e coerente

## 13.7 — Import multipli (batch)

Per importare più imprese in modo ordinato:

- usa **un file Excel per impresa** (batch)
- nomina i file in modo chiaro:
  - `R1_impresa_rossi.xlsx`
  - `R1_impresa_bianchi.xlsx`
  - `R2_impresa_rossi.xlsx`

Questo semplifica controlli e audit.

