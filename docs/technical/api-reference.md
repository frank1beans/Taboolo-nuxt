# API Reference

Riferimento completo degli endpoint API.

---

## Nuxt API (server/api)

Base: `/api`

### Progetti

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/projects` | Lista progetti (paginata) |
| POST | `/projects` | Crea progetto |
| GET | `/projects/:id` | Dettaglio progetto |
| PUT | `/projects/:id` | Aggiorna progetto |
| DELETE | `/projects/:id` | Elimina progetto |

### Import Computo

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/projects/:id/import-six` | Import SIX/XML |
| POST | `/projects/:id/import-six/preview` | Preview SIX |
| POST | `/projects/:id/import-xpwe` | Import XPWE |
| POST | `/projects/:id/import-xpwe/preview` | Preview XPWE |

### Offerte

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/projects/:id/offers` | Lista offerte |
| POST | `/projects/:id/offers` | Import offerta |
| PATCH | `/projects/:id/offers/:offerId` | Aggiorna offerta |
| DELETE | `/projects/:id/offers/:offerId` | Elimina offerta |

### Alert

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/projects/:id/offers/alerts` | Lista alert |
| GET | `/projects/:id/offers/alerts/summary` | Riepilogo alert |
| PATCH | `/projects/:id/offers/alerts/:alertId` | Risolvi alert |

### Preventivi

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/projects/:id/estimate/:estimateId` | Dettaglio preventivo |
| GET | `/projects/:id/estimate/:estimateId/items` | Voci preventivo |
| GET | `/projects/:id/estimate/:estimateId/comparison` | Confronto |
| DELETE | `/projects/:id/estimates/:estimateId` | Elimina preventivo |

### Catalogo

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/catalog` | Catalogo globale |
| GET | `/catalog/semantic-search` | Ricerca semantica |

### Analytics

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/analytics/global-map` | Mappa globale |
| POST | `/analytics/global-compute-map` | Calcola mappa |
| POST | `/price-estimator/estimate` | Stima prezzo |

---

## Python API (services/importer)

Base: `PYTHON_API_URL` (default `/api/v1`)

### Import

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/commesse/{id}/import-six` | Parse SIX |
| POST | `/commesse/{id}/import-xpwe/raw` | Parse XPWE |
| POST | `/commesse/{id}/ritorni` | Parse offerta |

### Analytics

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/analytics/global/compute-map` | Calcola UMAP |
| POST | `/analytics/global/map-data` | Dati mappa |
| POST | `/analytics/global/price-analysis` | Analisi prezzi |

### Estrazione

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/extraction/extract` | Estrai proprietà |
| POST | `/price-estimator/estimate` | Stima prezzo |

---

## Autenticazione

Attualmente l'API non richiede autenticazione. Per ambienti di produzione, implementare un layer di auth.
