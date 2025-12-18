# Documentazione Taboolo (Nuxt)

Questa cartella contiene la documentazione in formato Markdown, organizzata come un percorso unico "Studente":
un corso (stile universitario) che parte dalle basi della programmazione web moderna e arriva a spiegare come
ricostruire questo progetto (Nuxt + Nitro + Mongo + importer Python) step-by-step.

## Da dove iniziare

- Inizio corso: `docs/studente/README.md`
- Indice completo (master): `docs/SUMMARY.md`

## Percorsi consigliati

1) Sto imparando da zero:
   - parti da `docs/studente/README.md` e segui `docs/SUMMARY.md`
2) Voglio capire rapidamente la repo:
   - `docs/studente/parte-a-basi/05-tour-repo.md`
   - `docs/studente/parte-c-dominio-feature/09-dominio-taboolo-data.md`
   - `docs/studente/parte-c-dominio-feature/10-importer-python.md`
3) Voglio lavorare sulle API:
   - `docs/studente/parte-b-backend/07-nitro-h3-endpoints.md`
   - reference route: `docs/studente/appendici/riferimento/api-routes.md`

## Struttura

- Corso:
  - `docs/studente/parte-a-basi/`
  - `docs/studente/parte-b-backend/`
  - `docs/studente/parte-c-dominio-feature/`
  - `docs/studente/parte-d-approfondimenti/`
  - `docs/studente/parte-e-esercizi/`
- Laboratori utente: `docs/studente/laboratori/utente/` (workflow funzionale prima della tecnica)
- Appendici: `docs/studente/appendici/` (reference: route, pagine, glossario, curl, query Mongo)

## Stato (stabile vs in evoluzione)

Stabile:

- modello dati e persistenza Mongo
- import SIX raw e import offerte Excel (con pending resolution)
- viste principali: dashboard progetto/preventivo, listino, confronto, analytics

In evoluzione:

- cataloghi globali (`/catalogs`) e integrazioni secondarie
