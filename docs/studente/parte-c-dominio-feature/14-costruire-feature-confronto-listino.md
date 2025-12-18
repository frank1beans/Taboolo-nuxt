# 14 - Costruire "Listino" e "Confronto" (core analitico)

Queste due feature sono il cuore analitico dell'app:

- Listino: raggruppa per `PriceListItem` (PLI) e calcola totali
- Confronto: affianca imprese (colonne) e mostra delta e statistiche

Se import è "come entrano i dati", listino e confronto sono "come diventano decisioni".

Collegamenti:

- dominio: `docs/studente/parte-c-dominio-feature/09-dominio-taboolo-data.md`
- import/persistenza: `docs/studente/parte-c-dominio-feature/10-importer-python.md`
- griglie + WBS: `docs/studente/parte-c-dominio-feature/11-pagine-data-grid-wbs.md`

## 14.1 - Listino: concetto e requisiti

Listino (in questa app) significa:

- partire dalle `PriceListItem` (codice/descrizione/prezzo/unità)
- calcolare per ciascuna voce:
  - `total_quantity`
  - `total_amount`
- arricchire con WBS6/WBS7 (filtri e lettura)

Due modalità:

1) baseline mode (default):
   - i totali derivano da `EstimateItem.project.*`
2) offer mode (con query `round`/`company`):
   - i totali derivano dagli `OfferItem` dell'offerta selezionata

Vincolo importante:

- in offer mode devi supportare sia offerte aggregated (agganciate a PLI) sia offerte detailed (agganciate a EstimateItem).
  Quindi la pipeline è "ibrida".

## 14.2 - Listino: mappa file (UI e API)

### UI

- pagina: `app/pages/projects/[id]/pricelist/index.vue`
- config colonne: `app/composables/estimates/usePriceListGridConfig.ts`
- filtro WBS: `app/composables/useWbsTree.ts` (con `getLevels` custom per WBS6/WBS7)

La pagina fa anche una cosa molto "prodotto":

- mostra e risolve le pending (ambiguità LX) direttamente nella vista listino

### API

- listino: `GET /api/projects/:id/estimates/:estimateId/price-list`
  - file: `server/api/projects/[id]/estimates/[estimateId]/price-list.get.ts`

### Pending (ambiguità)

- lista pending: `GET /api/projects/:id/offers/pending`
  - file: `server/api/projects/[id]/offers/pending.get.ts`
- risoluzione: `PATCH /api/projects/:id/offers/items/:itemId`
  - file: `server/api/projects/[id]/offers/items/[itemId].patch.ts`

## 14.3 - API listino: cosa fa l'aggregazione (baseline vs offer mode)

File: `server/api/projects/[id]/estimates/[estimateId]/price-list.get.ts`

### 14.3.1 - Baseline mode (nessun round/company)

Pipeline concettuale:

1) `$match` PLI per `project_id + estimate_id`
2) `$lookup` su `estimateitems` collegati a quel PLI
3) `$addFields`:
   - `total_quantity = sum(EstimateItem.project.quantity)`
   - `total_amount`:
     - se gli amount esistono, somma amount
     - altrimenti fallback: `sum(quantity) * PLI.price`
4) `$lookup` WBS nodes (da `wbs_ids`)
5) estrazione WBS6/WBS7
6) sort per WBS e codice

Il fallback sugli importi esiste per compatibilità con import legacy che non salvavano amount.

### 14.3.2 - Offer mode (round/company presenti)

Qui la pipeline diventa ibrida, perché deve supportare:

- aggregated: `OfferItem.price_list_item_id == PLI._id`
- detailed: `OfferItem.estimate_item_id` -> devi risalire al PLI tramite `EstimateItem.price_list_item_id`

Strategia usata:

1) trova offerIds (`Offer.find` filtrando round/company)
2) `$lookup` su `estimateitems` per ottenere gli `_id` delle righe baseline collegate al PLI
3) `$lookup` su `offeritems` con una `$or`:
   - `offer_id in offerIds` AND `price_list_item_id == pli_id`
   - `offer_id in offerIds` AND `estimate_item_id in linked_est_items`
4) calcola `total_quantity` e `total_amount` sommando `related_items`

Questo è un punto architetturale importante: permette alla UI listino di lavorare con entrambe le modalità senza riscrivere tutto.

## 14.4 - Confronto: concetto e requisiti

Confronto significa:

- avere una tabella per righe "di progetto" (baseline)
- per ogni impresa, mostrare colonne affiancate con:
  - quantità/prezzo/importo
  - **Delta Prezzo vs Project** (vs preventivo)
  - **Delta Prezzo vs Media** (rispetto alla media offerte visibili)
  - **Delta Importo vs Project**
- supportare filtri avanzati (SelectMenu con search):
  - round (con badge indicatori)
  - impresa (con badge indicatori)
  - WBS (sidebar)

## 14.5 - Confronto: mappa file (UI e API)

### UI

- `app/pages/projects/[id]/estimate/[estimateId]/comparison.vue`

### API

- `GET /api/projects/:id/estimate/:estimateId/comparison`
  - file: `server/api/projects/[id]/estimate/[estimateId]/comparison.get.ts`

Nota importante:

- l'API restituisce anche `all_rounds` e `all_imprese` per popolare i dropdown in modo consistente, indipendentemente dai filtri attuali.

## 14.6 - Data shape e naming: attenzione alle chiavi "dinamiche"

Nel confronto, i nomi delle imprese diventano chiavi di oggetto, ad esempio:

```js
row.offerte["Impresa Rossi"].prezzo_unitario
```

È comodo per costruire colonne dinamiche, ma implica:

- attenzione a caratteri speciali (spazi, slash, ecc.)
- attenzione a imprese con nomi uguali o quasi uguali

Se vuoi robustezza maggiore, valuta:

- usare chiavi normalizzate (slug)
- o usare un id impresa separato da `displayName`

## 14.7 - Se dovessi costruire listino e confronto da zero (ricetta)

### 14.7.1 - Listino

1) definisci `PriceListItem` e salva `wbs_ids` per poter fare lookup WBS
2) salva nei `EstimateItem` un riferimento a `price_list_item_id`
3) crea endpoint `GET /price-list` con:
   - baseline mode: lookup estimateitems e somma quantità/importi
   - offer mode: lookup offeritems e somma su offeritems (ibrido)
4) UI:
   - DataGrid + WbsSidebar (solo WBS6/WBS7)
   - totale visibile
   - se aggregated/LX, integra pending resolution

### 14.7.2 - Confronto

1) decide "riga di confronto" (qui: voce di listino / aggregazione per PLI)
2) raccogli baseline (quantità e prezzo progetto)
3) raccogli offerte filtrate (round/company)
4) costruisci una struttura:
   - `row.offerte[companyName] = { quantita, prezzo_unitario, importo_totale, delta... }`
5) UI:
   - genera colonne per imprese
   - applica formatting e colori sui delta

## 14.8 - Esercizi

### Esercizio 1: aggiungere una colonna nel listino

Obiettivo: aggiungere una colonna client-side "Prezzo * Quantità" (anche se esiste `total_amount`).

Passi:

1) aggiungi colonna nel `usePriceListGridConfig`
2) usa un `valueGetter` che calcoli sul client
3) confronta con `total_amount` e verifica se coincidono (dovrebbero, salvo fallback)

### Esercizio 2: aggiungere un delta nel confronto

Obiettivo: per ogni impresa, aggiungere una colonna "Delta vs media".

Passi:

1) in `comparison.vue`, trova la costruzione delle colonne dinamiche
2) aggiungi una colonna con `valueGetter` basato su `delta_media`
3) applica uno stile coerente (verde/rosso) come gli altri delta

### Esercizio 3 (advanced): pending direttamente dal confronto

Idea:

- se una voce è pending, mostrarla con badge o in una sezione dedicata.

Passi:

1) esponi in API il conteggio pending per round/company
2) mostra badge nella UI confronto
3) link diretto alla risoluzione (listino) con query param corretti
