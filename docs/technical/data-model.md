# Modello Dati

Schema MongoDB delle entità principali.

---

## Project

Rappresenta un progetto/commessa.

```javascript
{
  _id: ObjectId,
  name: String,           // Nome progetto
  code: String,           // Codice univoco
  description: String,
  notes: String,
  business_unit: String,
  revision: String,
  status: "setup" | "in_progress" | "closed",
  created_at: Date,
  updated_at: Date
}
```

---

## Estimate

Preventivo (baseline).

```javascript
{
  _id: ObjectId,
  project_id: ObjectId,
  name: String,
  type: "project",
  is_baseline: Boolean,
  total_amount: Number,
  price_list_id: ObjectId,
  import_run_id: String,
  created_at: Date
}
```

---

## EstimateItem

Voce del computo.

```javascript
{
  _id: ObjectId,
  project_id: ObjectId,
  wbs_ids: [ObjectId],
  price_list_item_id: ObjectId,
  code: String,
  unit_measure: String,
  progressive: Number,
  order: Number,
  project: {
    estimate_id: ObjectId,
    quantity: Number,
    unit_price: Number,
    amount: Number
  }
}
```

---

## PriceList / PriceListItem

Listino e voci prezzate.

```javascript
// PriceList
{
  _id: ObjectId,
  project_id: ObjectId,
  estimate_id: ObjectId,
  name: String,
  currency: String,
  is_default: Boolean
}

// PriceListItem
{
  _id: ObjectId,
  project_id: ObjectId,
  code: String,
  description: String,
  long_description: String,
  unit: String,
  price: Number,
  wbs_ids: [ObjectId],
  embedding: [Number],      // Vettore Jina
  map2d: { x, y },
  map3d: { x, y, z },
  cluster: Number,
  extracted_properties: Object
}
```

---

## WbsNode

Nodo WBS.

```javascript
{
  _id: ObjectId,
  project_id: ObjectId,
  estimate_id: ObjectId,
  parent_id: ObjectId,
  ancestors: [ObjectId],
  type: "spatial" | "commodity",
  level: Number,
  code: String,
  description: String
}
```

---

## Offer / OfferItem

Offerta e voci.

```javascript
// Offer
{
  _id: ObjectId,
  project_id: ObjectId,
  estimate_id: ObjectId,
  company_name: String,
  round_number: Number,
  mode: "detailed" | "aggregated",
  status: "draft" | "submitted" | "accepted" | "rejected",
  total_amount: Number
}

// OfferItem
{
  _id: ObjectId,
  offer_id: ObjectId,
  project_id: ObjectId,
  origin: "baseline" | "addendum",
  source: "detailed" | "aggregated",
  resolution_status: "resolved" | "pending",
  estimate_item_id: ObjectId,
  price_list_item_id: ObjectId,
  quantity: Number,
  unit_price: Number,
  amount: Number
}
```

---

## OfferAlert

Alert/conflitto.

```javascript
{
  _id: ObjectId,
  project_id: ObjectId,
  offer_id: ObjectId,
  offer_item_id: ObjectId,
  type: "price_mismatch" | "quantity_mismatch" | "addendum" | ...,
  severity: "info" | "warning" | "error",
  status: "open" | "resolved" | "ignored",
  message: String,
  actual: Mixed,
  expected: Mixed,
  delta: Number
}
```

---

## Relazioni

```
Project
  └── Estimate (1:N)
        ├── WbsNode (1:N)
        ├── PriceList (1:1)
        │     └── PriceListItem (1:N)
        └── EstimateItem (1:N)

Project
  └── Offer (1:N)
        ├── OfferItem (1:N)
        └── OfferAlert (1:N)
```
