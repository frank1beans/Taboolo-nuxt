# 01 — Setup sviluppo

Questo capitolo descrive come avviare il progetto in locale.

## 1.1 — Requisiti

- Node.js (consigliato LTS)
- pnpm (il repo include `pnpm-lock.yaml`)
- MongoDB raggiungibile
- Servizio Python importer raggiungibile (per import SIX/Excel)

## 1.2 — Installazione

Da root:

```bash
pnpm install
```

## 1.3 — Avvio in sviluppo

```bash
pnpm dev
```

L’app si avvia tipicamente su `http://localhost:3000`.

## 1.4 — Build e preview

```bash
pnpm build
pnpm preview
```

## 1.5 — Lint

```bash
pnpm lint
```

## 1.6 — Variabili ambiente (minime)

Il progetto usa `runtimeConfig` (vedi `docs/studente/appendici/tecnico/02-configurazione-runtime.md`).

In particolare:

- `MONGODB_URI`: connessione Mongo (es. `mongodb://localhost:27017/taboolo`)
- `PYTHON_API_URL`: base URL dell’importer Python (default: `http://localhost:8000/api/v1`)

Nota: `.env` è ignorato dal repo (non versionato). Configura le variabili nel tuo ambiente o crea un `.env` locale.
