# 12 — Runbook operativo (gestione ambiente)

Questa sezione è pensata per chi mantiene l’ambiente (dev/staging/prod).

## 12.1 — Checklist “servizi up”

Per Taboolo servono:

- Nuxt/Nitro in esecuzione (porta 3000 in locale)
- MongoDB raggiungibile
- Python importer raggiungibile (per import)

## 12.2 — Verifica MongoDB

Segnali:

- in avvio Nitro, log: “Connected to MongoDB”
- se Mongo non risponde: le API che interrogano `#models` falliscono

Configurazione:

- `MONGODB_URI` (runtimeConfig `mongodbUri`)
- fallback: `mongodb://localhost:27017/taboolo`

## 12.3 — Verifica Python importer

Configurazione:

- `PYTHON_API_URL` (runtimeConfig `pythonApiBaseUrl`)

Segnali:

- preview SIX fallisce subito
- import offerta fallisce in upload

Verifica:

- dalla macchina che esegue Nitro, prova una chiamata HTTP verso `PYTHON_API_URL` (dipende dall’API del servizio)

## 12.4 — Endpoint debug (diagnosi)

Sono presenti endpoint di debug:

- `GET /api/debug-env`
- `GET /api/debug-inspect`

Nota:

> Valuta di limitarli o rimuoverli in produzione.

## 12.5 — “Totali strani” in produzione

Quando un utente segnala totali incoerenti:

1) verifica che stia guardando **baseline corretta** (estimateId)
2) verifica che i filtri round/company siano quelli attesi
3) controlla pending
4) se serve, esegui query DB (vedi `docs/studente/appendici/tecnico/13-mongo-query.md`)
