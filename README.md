# Taboolo (Nuxt)

Repository per Taboolo: web app Nuxt (frontend) + Nitro (backend) + MongoDB (persistenza) + servizio Python per parsing/import.

## Documentazione

- Guida generale: `docs/README.md`
- Indice completo: `docs/SUMMARY.md`
- Inizio corso ("Studente"): `docs/studente/README.md`

## Avvio rapido (sviluppo)

Prerequisiti:

- Node.js (LTS) + pnpm
- MongoDB raggiungibile
- Python (per `services/importer/`)

Install:

```bash
pnpm install
```

Dev server (Nuxt):

```bash
pnpm dev
```

App su:

- `http://localhost:3000`

Lint:

```bash
pnpm lint
```

## Servizi esterni (locale)

Variabili ambiente principali:

- `MONGODB_URI`
- `PYTHON_API_URL` (default atteso: `http://localhost:8000/api/v1`)

Servizio Python importer (esempio):

```bash
cd services/importer
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Dettagli e troubleshooting:

- `docs/studente/parte-b-backend/06-runtime-config-e-env.md`
- `docs/studente/parte-c-dominio-feature/10-importer-python.md`
- `docs/studente/parte-d-approfondimenti/21-python-importer-servizio.md`
