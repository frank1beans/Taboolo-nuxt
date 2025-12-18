# 04 — Import offerte (Excel)

Questo capitolo spiega come importare un ritorno d’offerta da file Excel.

## 4.1 — Prima di importare: controlla la baseline

Le offerte si **agganciano sempre** a un preventivo di progetto (baseline).
Quindi:

1) importa prima il computo (SIX/XML) → `docs/studente/laboratori/utente/03-import-computo-six.md`
2) verifica che il preventivo compaia nel progetto
3) solo dopo importa le offerte

## 4.2 — Due modi di import: LX (aggregata) vs MX (dettagliata)

Taboolo supporta due modalità principali:

### LX — Offerta “lista” (aggregata)

Caratteristiche:

- l’offerta è una lista di prodotti/righe che si agganciano al **listino**;
- l’aggancio avviene principalmente tramite **codice** (o descrizione se manca codice);
- è più robusta quando l’Excel non replica la stessa struttura del computo.

Quando usarla:

- hai un Excel “sintetico” per voce di listino;
- non hai il progressivo/riga del computo baseline.

Possibile contro:

- alcune righe possono essere **ambigue** (stessa descrizione per più codici) → finiscono in stato **pending** da risolvere.

### MX — Offerta “computo” (dettagliata)

Caratteristiche:

- l’offerta si aggancia a righe del computo baseline (tipicamente tramite **progressivo**);
- è ideale quando l’Excel è la “copia” del computo, riga per riga.

Quando usarla:

- l’Excel ha una colonna di progressivo coerente col baseline;
- vuoi il massimo dettaglio e un confronto preciso per riga.

Possibile contro:

- se i progressivi non coincidono o mancano, alcune voci possono risultare “addendum” (non agganciate).

## 4.3 — Dove si fa l’import

Dentro un progetto → **Importa Dati** → tab **Import Offerta (Excel)**.

L’import è guidato da una procedura (wizard) in 3 step:

1) **Configurazione**
2) **File**
3) **Mappatura**

## 4.4 — Step 1: configurazione

In questa fase scegli:

- **Baseline**: il preventivo di progetto a cui agganciare l’offerta  
  (se il progetto ha più baseline, è fondamentale scegliere quella corretta)
- **Modalità**: LX o MX (vedi sopra)
- **Tipo upload**:
  - **File singolo**: importi un’impresa alla volta (consigliato per iniziare)
  - **Batch**: importi più file (uno per impresa) in sequenza
  - **Multi-impresa**: modalità avanzata/sperimentale (se presente in UI potrebbe non essere completa)

Consiglio: parti con **File singolo** finché non hai confidenza con i risultati.

## 4.5 — Step 2: selezione file e metadati

Carica il file Excel e poi:

- scegli il **foglio** (sheet) corretto
- compila (o conferma):
  - **Impresa** (obbligatoria)
  - **Round** (di default 1)

Nota: se l’Excel contiene più fogli, assicurati di selezionare quello con la tabella “vera”.

## 4.6 — Step 3: mappatura colonne (il passaggio più importante)

Devi dire a Taboolo quali colonne dell’Excel corrispondono a quali campi.

Campi tipici:

- **Codice** (facoltativo se hai Descrizione)
- **Descrizione** (facoltativa se hai Codice)
- **Prezzo** (obbligatorio)
- **Quantità** (obbligatoria)
- **Progressivo** (solo MX, consigliato se disponibile)

Regola:

> Serve almeno uno tra **Codice** o **Descrizione**.  
> In più servono sempre **Prezzo** e **Quantità**.

Il wizard prova ad auto-detectare le colonne più probabili, ma verifica sempre.

## 4.7 — Cosa succede dopo l’import

Dopo un import riuscito:

- nella dashboard del preventivo comparirà una nuova **offerta** con:
  - impresa
  - round
  - totale (se disponibile)
- potrai aprire:
  - **Dettaglio Offerta** (voci filtrate per round/impresa)
  - **Confronto** (affiancamento colonne)
  - **Listino** (anche in ottica offerta)

## 4.8 — Quando compaiono voci “pending”

Le voci “pending” compaiono soprattutto in modalità **LX** quando:

- un match per descrizione/codice non è univoco;
- la descrizione dell’Excel è troppo generica;
- nel listino ci sono duplicati simili.

In quel caso Taboolo ti chiede di scegliere il codice corretto:

- vai in `docs/studente/laboratori/utente/09-risoluzione-ambiguita.md`
- oppure apri direttamente la pagina “Listino” e usa il pannello “Voci da risolvere”.
