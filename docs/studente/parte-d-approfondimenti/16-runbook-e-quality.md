# 16 - Qualità, debug, runbook (come mantenere il progetto)

Obiettivo: saper operare sulla repo con disciplina (lint, debug, runbook) e ridurre regressioni.

Questo capitolo è pensato per quando:

- inizi a fare modifiche vere (non solo studio)
- devi risolvere bug "sporchi" (import, match, totali che non tornano)
- devi consegnare una release o una demo

## 16.1 - Qualità minima: lint e coerenza

Script:

- `pnpm lint`

Config:

- `eslint.config.mjs`

Regola pratica:

- prima di aprire PR o consegnare una modifica, esegui lint

Se lint fallisce:

- non ignorarlo: o sistemi o spieghi perché va ignorato (eccezioni rare)

## 16.2 - Debug: il percorso più veloce (UI -> API -> DB -> Python)

Quando qualcosa "non torna", usa sempre questo ordine:

1) UI:
   - route params e query string sono corretti?
   - cosa mostra davvero la griglia? (filtri attivi?)
   - Network tab: endpoint, status, payload
2) API Nitro:
   - log server (errore, stacktrace)
   - validazione ObjectId e parametri richiesti
3) DB:
   - esistono i documenti attesi? (Project, Estimate, Offer, Items)
   - i conteggi sono plausibili?
4) Python importer:
   - `PYTHON_API_URL` corretto?
   - parsing fallisce? sheet/colonne errate? rate limit?

Questo è il ciclo che evita il "debug a tentativi".

## 16.3 - Logging: come tenerlo utile (senza inondare)

Se aggiungi log:

- includi sempre gli id (projectId, estimateId, offerId) e la fase
- evita log per ogni riga (hot path)
- preferisci log riassuntivi:
  - count
  - id
  - durata (se puoi)

Esempio buono:

- `[ImportSIX] Starting Raw Import <importId> for Project <projectId>`

Esempio rischioso:

- loggare ogni `EstimateItem` in un import da 50.000 righe (diventa ingestibile)

## 16.4 - Checklist "prima di una demo"

Una checklist concreta (da spuntare):

- Mongo raggiungibile? (log "Connected to MongoDB")
- Python importer raggiungibile? (`/docs` in debug o chiamate che rispondono)
- esiste almeno un progetto con baseline importata?
- totale baseline plausibile (non 0, non NaN)
- import offerte completato (almeno una impresa e un round)
- pending: o risolte o mostrate chiaramente
- listino:
  - carica
  - filtro WBS funziona
  - totale visibile coerente
- confronto:
  - colonne imprese coerenti
  - delta visibili

## 16.5 - Debito tecnico: cose da sapere (non necessariamente bug)

1) Path API "estimate" vs "estimates":
   - convivono entrambi (legacy + nuovo)
2) ID string vs ObjectId:
   - alcuni campi (es. `EstimateItem.price_list_item_id`) possono essere string e richiedono conversione in aggregazioni
3) API client molto grande:
   - `app/lib/api-client.ts` contiene anche funzioni non implementate lato backend (legacy)

Regola: prima di eliminare "codice morto", verifica che non sia usato da flussi reali.

## 16.6 - Runbook operativo (reference)

Appendice pronta:

- `docs/studente/appendici/tecnico/12-runbook-operativo.md`

Query Mongo utili:

- `docs/studente/appendici/tecnico/13-mongo-query.md`

## 16.7 - Esercizio: scrivi la tua checklist pre-release

Scrivi una checklist (anche su carta) che includa:

- servizi su (Mongo + Python)
- import baseline ok
- import offerte ok
- pending gestite
- listino e confronto coerenti
- lint eseguito

Questo esercizio ti porta a ragionare come maintainer.
