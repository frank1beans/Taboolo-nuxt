# 10 — Risoluzione problemi (Troubleshooting)

Questo capitolo raccoglie i problemi più comuni e cosa fare.

> Se non sei tecnico, esegui i controlli “utente” e poi inoltra i dettagli (messaggio errore, file, screenshot) al team tecnico.

## 10.1 — Import computo: la preview fallisce

Sintomi:

- appare “Errore durante l’analisi del file”
- non compaiono preventivi selezionabili

Cause tipiche:

- file `.six/.xml` non valido o corrotto
- servizio import (Python) non raggiungibile

Cosa fare:

1) riprova (chiudi e riapri import)
2) prova a riesportare il file da STR Vision
3) se persiste: segnala al team tecnico indicando ora, progetto e file

## 10.2 — Import computo: successo ma non vedo voci

Checklist:

- hai selezionato il preventivo corretto (quando ce n’erano più di uno)?
- nel progetto compare il preventivo nella lista?
- aprendo “Dettaglio Preventivo” vedi tabella vuota?

Azioni:

- ripeti import selezionando un altro preventivo dalla lista preview
- verifica che in preview il conteggio “voci” sia > 0

## 10.3 — Totali progetto a 0 o palesemente errati

Possibili cause:

- quantità o prezzi mancanti nel computo importato
- listino non popolato o prezzi = 0

Azioni:

- apri “Listino” e verifica la colonna “Prezzo Unit.”
- apri “Dettaglio Preventivo” e controlla quantità/prezzi delle prime righe

Se i prezzi mancano già nel file sorgente, il totale non può essere corretto: serve correggere l’export.

## 10.4 — Import offerta: errore in fase di upload

Cause comuni:

- baseline non selezionata (quando richiesta)
- foglio Excel errato (colonne diverse)
- mappatura colonne sbagliata (prezzo/quantità)

Azioni:

1) controlla che la baseline sia selezionata nello step “Configurazione”
2) controlla il foglio selezionato
3) rimappa le colonne e riprova

## 10.5 — Offerta importata ma non vedo righe nel dettaglio offerta

Checklist:

- stai aprendo il dettaglio partendo dalla riga dell’offerta (così round/impresa sono coerenti)?
- round e impresa nella URL sono corretti?

Azioni:

- apri l’offerta dalla dashboard preventivo (non manualmente copiando URL)
- verifica che impresa e round siano quelli importati

## 10.6 — Voci pending: non riesco a risolverle / non vedo candidati

Cause:

- nel listino non esistono voci candidabili (mancano codici/descrizioni)
- la voce importata è troppo “fuori standard”

Azioni:

- controlla se nel listino esiste la voce attesa
- se non esiste: serve correggere la baseline/listino o importare un listino più completo

## 10.7 — Errori di connessione (da segnalare al team)

Se vedi errori ripetuti su import o caricamento dati, potrebbero dipendere da:

- connessione a **MongoDB** non disponibile
- servizio **Python importer** non raggiungibile

In questi casi:

- raccogli il messaggio di errore
- segnala al team tecnico (è un problema di infrastruttura/configurazione)

