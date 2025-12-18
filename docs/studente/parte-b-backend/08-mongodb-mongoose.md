# 08 - MongoDB + Mongoose (modelli, relazioni, indici)

Obiettivo: capire come la repo salva e recupera dati, e come ragionare su schema, query e performance.

Taboolo usa MongoDB come database principale e Mongoose come ODM (Object Document Mapper).

Non serve diventare DBA. Serve:

- sapere dove sono i modelli
- capire come si costruiscono le query
- evitare i bug classici (ObjectId vs string, serializzazione, indici mancanti)

## 08.1 - Connessione: dove e come avviene

File: `server/plugins/mongoose.ts`

Qui avviene il `mongoose.connect(...)`.

Comportamento tipico:

- se la connessione va a buon fine: log "Connected to MongoDB"
- se fallisce: il server può partire comunque, ma le API DB-centric falliranno quando interrogano Mongo

Nota architetturale: in alcuni progetti si preferisce fallire "hard" all'avvio se Mongo non è disponibile. Qui, al momento, la scelta è più permissiva.

## 08.2 - Modelli: dove sono e come si importano

I modelli sono in:

- `server/models/*.schema.ts`

Si importano con alias Nitro:

```ts
import { Project, Estimate } from '#models'
```

I modelli principali:

- `Project` (commessa)
- `Estimate` (preventivo baseline, e anche "offerta" in alcune forme)
- `EstimateItem` (riga di computo)
- `Offer` / `OfferItem` (ritorni/offerte)
- `Wbs` (struttura gerarchica)
- `PriceList` / `PriceListItem` (listino)
- `UserContext` (contesto "corrente" selezionato)

## 08.3 - Cosa devi sapere per iniziare (Mongo in 8 righe)

- Mongo salva documenti JSON-like (BSON)
- ogni documento ha un `_id` (di solito ObjectId)
- un ObjectId non è una stringa: è un tipo specifico
- Mongoose definisce schema, validazioni e indici
- le query più comuni sono `find`, `findOne`, `findById`, `update`, `aggregate`
- molte "relazioni" si fanno con campi id (non join automatici come SQL)

## 08.4 - ObjectId vs string: l'errore che farai almeno una volta

Caso tipico:

- in una collezione hai `price_list_item_id` come stringa
- in un'altra lo hai come ObjectId

Conseguenze:

- nelle aggregazioni devi convertire string -> ObjectId (`$toObjectId` / `$convert`)
- se la string non è valida, la conversione produce `null` o fallisce

Per questo in alcune pipeline vedrai:

- `$addFields` con una conversione e un campo "oid" temporaneo

Esercizio:

1) cerca `pli_oid` in `server/api/projects/[id]/estimate/[estimateId]/items.get.ts`
2) spiega perché esiste quel `$addFields`

## 08.5 - Collezioni: i nomi reali contano nelle `$lookup`

Quando fai `Model.aggregate([...])` e usi `$lookup`, devi sapere il nome della collection.

Mongoose, di default, pluralizza e lowercasa il nome del model.

Esempio:

- model `PriceListItem` -> collection `pricelistitems`

Quindi in una `$lookup` potresti vedere:

```ts
{ $lookup: { from: 'pricelistitems', localField: '...', foreignField: '...', as: '...' } }
```

Se sbagli `from`, la join torna vuota e tu perdi ore.

## 08.6 - Serializzazione: perché esiste `serialize`

File: `server/utils/serialize.ts`

Serve a rendere i documenti "JSON-safe" per il frontend:

- ObjectId -> string
- rimozione campi interni (`__v`, ecc.)
- forma coerente (es. `id` invece di `_id`)

Regola: quando esponi dati Mongo su API, assicurati che siano serializzabili e stabili.

## 08.7 - `.lean()`: performance e payload

Nelle query Mongoose vedrai spesso `.lean()`.

Significa:

- ritorna plain objects (non documenti Mongoose "pesanti")
- più veloce e più "JSON-friendly"

Regola pratica:

- se non ti serve `doc.save()` o hook Mongoose, usa `.lean()`

## 08.8 - CRUD tipico: cosa troverai nei servizi

Operazioni frequenti:

- lettura: `find`, `findOne`, `findById`
- creazione: `create`
- update atomico: `findOneAndUpdate` / `findByIdAndUpdate`
- pulizia/cascade: `deleteMany`, `deleteOne`

In un import è comune:

1) cancellare items precedenti per un certo contesto (project + estimate)
2) reinserire massivamente nuovi items
3) aggiornare WBS e totali

Questo rende l'import idempotente (ripetibile) e semplifica la gestione di "rifare l'import".

## 08.9 - Aggregation pipeline: fondamentale per griglie e analytics

Molte API usano `Model.aggregate([...])`.

Blocchi tipici:

- `$match`: filtra (equivalente di WHERE)
- `$addFields`: calcola campi
- `$lookup`: join con altre collezioni
- `$unwind`: "apre" un array
- `$group`: aggrega
- `$project`: seleziona e rinomina
- `$sort`: ordina
- `$limit` / `$skip`: paginazione

Esempi reali:

- totali dashboard progetto: `server/api/projects/[id]/context.get.ts`
- items baseline/offerta: `server/api/projects/[id]/estimate/[estimateId]/items.get.ts`
- listino aggregato: `server/api/projects/[id]/estimates/[estimateId]/price-list.get.ts`

## 08.10 - Indici e performance (lettura pratica)

Gli indici sono definiti negli schema con `.index(...)`.

Un indice è importante quando una query ripete sempre gli stessi filtri.

Esempio mentale:

- se interroghi spesso per `project_id` + `estimate_id`
- allora un indice su quei campi evita scansioni complete

Non devi indovinare: guardi le query più frequenti (API principali) e costruisci indici coerenti.

## 08.11 - Esercizio: leggere uno schema e descriverlo come "contratto"

Scegli uno schema, ad esempio:

- `server/models/offer-item.schema.ts`

Scrivi una descrizione:

1) quali campi sono obbligatori
2) quali indici ci sono
3) come capisci che supporta più modalità (detailed/aggregated, round/company, ecc.)

## 08.12 - Approfondimenti utili nella repo

- dominio e invarianti: `docs/studente/parte-c-dominio-feature/09-dominio-taboolo-data.md`
- modello dati (appendice): `docs/studente/appendici/tecnico/03-modello-dati.md`
- note serializzazione: `server/MONGODB_SERIALIZATION.md`
- query e snippet: `docs/studente/appendici/tecnico/13-mongo-query.md`
