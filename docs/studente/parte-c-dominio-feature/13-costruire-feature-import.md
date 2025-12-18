# 13 - Costruire la feature "Import" (SIX + Excel) in modo robusto

Obiettivo: capire e saper ricostruire la feature più critica del prodotto.

La feature Import è composta da due pipeline distinte:

1) Import computo (SIX/XML) -> baseline (Estimate + WBS + listino + righe)
2) Import offerta (Excel) -> ritorni (Offer + OfferItem)

La difficoltà non è "fare upload": la difficoltà è rendere il flusso affidabile con file reali e mantenere invarianti di dominio.

Collegamenti:

- dominio: `docs/studente/parte-c-dominio-feature/09-dominio-taboolo-data.md`
- pipeline tecnica: `docs/studente/parte-c-dominio-feature/10-importer-python.md`
- wizard frontend: `docs/studente/parte-d-approfondimenti/20-upload-file-excel-e-wizard.md`

## 13.1 - Import computo (SIX/XML) -> baseline

### 13.1.1 - UI: la pagina import

Pagina:

- `app/pages/projects/[id]/import/index.vue`

Client:

- `app/lib/api-client.ts` (funzioni preview/import SIX)

Workflow UI (semplificato):

1) utente carica file SIX/XML
2) preview: l'utente sceglie il preventivo dentro il file (se il file contiene più preventivi)
3) conferma import: invia file + `estimate_id` selezionato
4) redirect verso dashboard/estimate

Perché serve preview:

- l'utente deve scegliere il "preventivo giusto"
- evita import sbagliati e riduce la necessità di rollback

### 13.1.2 - API Nitro: preview e import

- preview: `server/api/projects/[id]/import-six/preview.post.ts`
- import: `server/api/projects/[id]/import-six.post.ts`

Nota importante:

- la modalità legacy SIX è disabilitata: il flusso stabile è raw (`?mode=raw`)

### 13.1.3 - Persistenza DB: cosa viene creato/aggiornato

File:

- `server/services/ImportPersistenceService.ts` (`persistProjectEstimate`)

Effetti:

- upsert `Estimate` baseline
- upsert WBS per estimate (`WbsNode`)
- upsert listino per estimate (`PriceList` + `PriceListItem`)
- delete+insert righe baseline (`EstimateItem`)

Regola: l'import baseline deve essere idempotente (importare due volte non deve creare duplicati).

## 13.2 - Import offerta (Excel) -> ritorni

### 13.2.1 - UI: wizard offerte

Componenti:

- `app/components/projects/ImportWizard.vue`
- `app/components/projects/ExcelOfferUpload.vue` (flusso più semplice, se usato)

Lettura Excel nel browser:

- `app/composables/useExcelReader.ts`

Client:

- `app/lib/api-client.ts` (funzione `uploadBidOffer` e varianti batch)

Workflow wizard (semplificato):

1) selezione baseline (estimate) a cui agganciare l'offerta
2) scelta modalità (LX/MX) e round/impresa
3) selezione file e foglio
4) mappatura colonne (codice/descrizione/prezzo/quantità, ecc.)
5) upload

Perché la baseline selection è critica:

- senza baseline selection, la persistenza deve "indovinare" e può sbagliare
- un link errato rompe confronto, listino e analytics

### 13.2.2 - API Nitro: endpoint offerte

Endpoint:

- `POST /api/projects/:id/offers`

File:

- `server/api/projects/[id]/offers.post.ts`

Particolarità:

- alcune info (estimate_id, mode, company, round_number) possono arrivare anche in query string
  per evitare di consumare lo stream multipart due volte.

### 13.2.3 - Persistenza DB: cosa viene creato/aggiornato

File:

- `server/services/ImportPersistenceService.ts` (`persistOffer`)

Effetti:

- upsert `Offer` (testata) con chiave (project + company + round)
- delete+insert `OfferItem` (righe)
- pending resolution quando match non è univoco (aggregated)

## 13.3 - Costruire import "da zero": i mattoni (architettura)

Se dovessi costruire la feature import in un progetto nuovo, i mattoni sono:

1) UI: upload file (drag&drop) + wizard multi-step
2) API: endpoint multipart (Nitro)
3) proxy: inoltro verso servizio di parsing (Python)
4) mapping: normalizzazione payload in contratto stabile
5) persistenza: upsert e dedup su Mongo
6) UX: feedback, progress, error handling

In questa repo:

- (3) è `server/utils/python-proxy.ts`
- (4) è `server/utils/python-mappers.ts`
- (5) è `server/services/ImportPersistenceService.ts`

## 13.4 - Error handling: distinguere le cause (UX e debug)

Quando un import fallisce, il problema è quasi sempre in uno di questi punti:

1) file non valido / foglio sbagliato
2) servizio Python non raggiungibile (URL errato o down)
3) mapping colonne errato (prezzo/quantità/progressivo)
4) DB: ObjectId non valido o conversione fallita
5) dedup: re-import che sovrascrive/duplica in modo inatteso

Checklist rapida:

- controlla request (Network)
- controlla log Nitro
- controlla error payload (createError data)
- controlla DB (conteggio righe e testate)

Appendici utili:

- curl: `docs/studente/appendici/tecnico/11-api-esempi-curl.md`
- query Mongo: `docs/studente/appendici/tecnico/13-mongo-query.md`

## 13.5 - Esercizi (da fare davvero)

### Esercizio 1: rendere obbligatoria la baseline selection nel wizard

Motivo:

- senza baseline selection, `persistOffer` deve indovinare (rischio alto).

Implementazione:

- in `ImportWizard.vue`, blocca lo step se esistono baseline e non è selezionata.

### Esercizio 2: UI di errore più informativa

Obiettivo:

- distinguere "errore Python" da "errore DB" da "errore mapping".

Suggerimenti:

- lato server: includere `data: { phase: 'preview' | 'import' | 'persist', ... }` in `createError`
- lato client: mostrare `phase` nel toast o in un alert.

### Esercizio 3: import batch single file

Esiste un endpoint dedicato:

- `POST /api/projects/:id/offers/batch-single-file`

Esercizio:

- integrare la UI per usarlo (utile se importi molte imprese da un solo Excel)

## 13.6 - Checkpoint: quando puoi dire "capisco l'import"

Se sai rispondere a queste domande, ci sei:

1) quali endpoint vengono chiamati per import baseline e offerte?
2) che differenza c'è tra proxy e persistenza?
3) perché usiamo delete+insert su righe?
4) che cosa rende una riga "pending" e come si risolve?
