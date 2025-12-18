# 01 — Primi passi

Obiettivo: arrivare da “zero” a vedere un confronto tra offerte.

In questo capitolo ti portiamo, passo dopo passo, a usare il programma per la prima volta.

## 1.1 — Prima di iniziare (cosa ti serve)

- Un accesso all’app Taboolo (URL fornito dal tuo team).
- Un **file computo** esportato da STR Vision (o equivalente) in formato **`.six`** o **`.xml`**.
- Uno o più file **Excel** con i ritorni d’offerta (uno per impresa, oppure batch).
- Conoscere (anche approssimativamente):
  - nome dell’**impresa**;
  - numero di **round**;
  - quali colonne dell’Excel contengono **codice/descrizione**, **prezzo**, **quantità**.

## 1.2 — Step 1: apri l’elenco progetti

Vai su **Progetti** (di solito è la pagina iniziale).

Cosa trovi:

- una tabella con i progetti esistenti;
- un pulsante “Nuovo progetto”.

## 1.3 — Step 2: crea un progetto

1) Clicca **Nuovo progetto**  
2) Compila:
   - **Nome**: descrittivo, es. “Commessa 2025 – Scuola X”
   - **Codice**: univoco, es. “SCUOLA-X-2025”
   - **Business Unit** (se usata in azienda)
   - **Stato** (setup / in_progress / closed)
3) Salva

Suggerimento: scegli un **codice** standard (utile per ritrovare e fare export).

## 1.4 — Step 3: entra nel progetto e vai su Importazione

Apri il progetto (click sulla riga).
Troverai la pagina “Preventivi” con un pulsante **Importa Dati**.

Entra in **Importazione**.

## 1.5 — Step 4: importa il computo (SIX/XML) = baseline

Nel tab **Import Computo (SIX/XML)**:

1) Trascina o seleziona il file `.six`/`.xml`
2) Attendi la **preview** (Taboolo legge il file e ti mostra i preventivi disponibili)
3) Seleziona il preventivo corretto (quando il file ne contiene più di uno)
4) Conferma l’importazione

Cosa succede:

- viene creato/aggiornato un **preventivo di progetto** (baseline);
- vengono salvate le **voci** del computo;
- vengono salvati anche **WBS** e **listino** associati a quel preventivo.

Dettagli e casi speciali: `docs/studente/laboratori/utente/03-import-computo-six.md`.

## 1.6 — Step 5: importa una prima offerta (Excel)

Nel tab **Import Offerta (Excel)**:

1) Seleziona la **baseline** (preventivo di progetto) a cui agganciare l’offerta
2) Scegli modalità:
   - **LX (lista / aggregata)**: l’offerta si aggancia per *codice/descrizione* al listino
   - **MX (computo / dettagliata)**: l’offerta si aggancia per *progressivo/riga* al computo baseline
3) Carica l’Excel, scegli il foglio e indica:
   - **Impresa**
   - **Round**
4) Mappa le colonne (prezzo/quantità e, a scelta, codice/descrizione)
5) Avvia import

Dettagli: `docs/studente/laboratori/utente/04-import-offerte-excel.md`.

## 1.7 — Step 6: verifica il risultato (dashboard preventivo)

Torna alla pagina del progetto → apri il **preventivo**.

Nella dashboard:

- vedrai una riga “Preventivo di progetto” (baseline);
- vedrai una o più **offerte** con round e impresa;
- Taboolo mostra delta vs progetto e evidenzia la “migliore offerta”.

Dettagli: `docs/studente/laboratori/utente/05-dashboard-preventivo.md`.

## 1.8 — Step 7: apri il confronto (Round e imprese)

Dal preventivo:

- apri la schermata **Confronto** per vedere colonne affiancate per impresa;
- applica filtri (round, impresa) e usa la WBS per restringere il perimetro.

Dettagli: `docs/studente/laboratori/utente/07-confronto-offerte.md`.
