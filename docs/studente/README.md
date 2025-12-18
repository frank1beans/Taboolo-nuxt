# Studente - Corso completo per costruire Taboolo (Nuxt)

Questa è la documentazione principale della repo: un percorso unico pensato come "corso universitario".

L'obiettivo non è solo "sapere dove sta cosa", ma arrivare a:

1) capire perché l'architettura è fatta così;
2) saperla ricostruire da zero (o rifattorizzare) senza copiare a memoria;
3) saperci lavorare (debug, estensioni, manutenzione).

## A chi è rivolto

- Studente assoluto (0-0-0): inizia dal capitolo 00 e segui `docs/SUMMARY.md`.
- Sviluppatore junior: parti da `docs/studente/parte-a-basi/05-tour-repo.md`, poi torna indietro sui fondamentali quando serve.
- Sviluppatore esperto: vai dritto su import/DB/aggregazioni e usa appendici e reference.

## Come è organizzato il corso

L'indice completo è in `docs/SUMMARY.md`. Qui sotto c'è la mappa per orientarti.

### Parte A - Basi (programmazione + framework)

Impari:

- TypeScript pratico (quanto basta per lavorare senza panico)
- Vue 3 + Composition API
- Nuxt 4 (routing, pages, SSR/SPA, plugin)
- come navigare una repo reale

### Parte B - Config e backend (Nitro + Mongo)

Impari:

- runtime config e `.env`
- endpoint Nitro (h3)
- MongoDB + Mongoose (schema, query, aggregazioni)

### Parte C - Dominio e feature (Taboolo)

Impari il dominio Taboolo e come costruire le feature principali:

- progetti/commesse
- preventivi baseline
- offerte (round/impresa) in modalità LX/MX
- listino, pending resolution, confronto

### Parte D - Approfondimenti

Capitoli "da laboratorio tecnico":

- architettura frontend (data layer, DataGrid, store)
- UI stack (Nuxt UI, Tailwind, tema)
- upload file e wizard Excel
- servizio Python importer (FastAPI, endpoint, parser)

### Parte E - Esercizi (capstone)

Una lista di esercizi progressivi e un progetto finale per dimostrare competenza reale:

- `docs/studente/parte-e-esercizi/17-esercizi.md`

## Materiale di supporto (già pronto)

- Laboratori utente (workflow funzionale): `docs/studente/laboratori/utente/00-introduzione.md`
- Appendici tecniche (reference da manuale): `docs/studente/appendici/tecnico/00-panorama-architettura.md`
- Appendici di riferimento (route/pagine/glossario): `docs/studente/appendici/riferimento/api-routes.md`

## Stato (cosa consideriamo stabile)

Per la scrittura del "libro" consideriamo stabili:

- modello dati e persistenza Mongo (Project/Estimate/Offer + items)
- import SIX raw e import offerte Excel (con pending resolution)
- viste principali: dashboard progetto/preventivo, listino, confronto, analytics

Sono tipicamente in evoluzione:

- pagine/feature non collegate ai flussi principali (es. `/catalogs`)
- funzioni legacy presenti nel client API ma non supportate da backend (finché non vengono rifinite)
