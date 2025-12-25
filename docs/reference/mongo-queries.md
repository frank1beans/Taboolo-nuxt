# 13 — Query MongoDB utili (debug)

Questa sezione contiene query “da debug” per ispezionare i dati.

> Esempi in stile mongosh. Adatta a seconda del tuo ambiente.

## 13.1 — Collezioni principali

- `projects`
- `estimates`
- `wbsnodes`
- `pricelists`
- `pricelistitems`
- `estimateitems`
- `offers`
- `offeritems`
- `usercontexts`

## 13.2 — Trova progetto per codice

```js
db.projects.find({ code: "SCUOLA-X-2025" })
```

## 13.3 — Elenca preventivi di un progetto

```js
db.estimates.find({ project_id: ObjectId("<PROJECT_ID>") }).sort({ created_at: -1 })
```

## 13.4 — Elenca offerte collegate a una baseline

```js
db.offers.find({
  project_id: ObjectId("<PROJECT_ID>"),
  estimate_id: ObjectId("<BASELINE_ESTIMATE_ID>")
}).sort({ round_number: 1, company_name: 1 })
```

## 13.5 — Trova righe pending

```js
db.offeritems.find({
  project_id: ObjectId("<PROJECT_ID>"),
  resolution_status: "pending"
}).limit(50)
```

## 13.6 — Conta righe baseline (EstimateItem)

```js
db.estimateitems.countDocuments({
  project_id: ObjectId("<PROJECT_ID>"),
  "project.estimate_id": ObjectId("<BASELINE_ESTIMATE_ID>")
})
```

## 13.7 — Controlla PLI per estimate

```js
db.pricelistitems.countDocuments({
  project_id: ObjectId("<PROJECT_ID>"),
  estimate_id: ObjectId("<BASELINE_ESTIMATE_ID>")
})
```

## 13.8 — “Perché non trovo il match?” (aggregated)

In aggregated, il match è spesso per `code` o descrizione normalizzata (lato import).
Per capire duplicati:

```js
db.pricelistitems.aggregate([
  { $match: { estimate_id: ObjectId("<BASELINE_ESTIMATE_ID>") } },
  { $group: { _id: "$code", n: { $sum: 1 } } },
  { $match: { n: { $gt: 1 } } },
  { $sort: { n: -1 } }
])
```

