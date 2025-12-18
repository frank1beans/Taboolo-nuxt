# 11 — API: esempi (curl)

Questa sezione contiene esempi pratici per chiamare le API principali.

> Nota: gli esempi sono in stile bash. In ambiente Windows PowerShell puoi usare `curl.exe` o `Invoke-RestMethod`.

## 11.1 — Progetti

### Lista progetti

```bash
curl -sS "http://localhost:3000/api/projects?page=1&pageSize=50"
```

### Crea progetto

```bash
curl -sS -X POST "http://localhost:3000/api/projects" \
  -H "Content-Type: application/json" \
  -d '{"name":"Commessa Demo","code":"DEMO-001","status":"setup"}'
```

### Contesto progetto

```bash
curl -sS "http://localhost:3000/api/projects/<PROJECT_ID>/context"
```

## 11.2 — Import SIX (preview + import)

### Preview (Raw)

```bash
curl -sS -X POST "http://localhost:3000/api/projects/<PROJECT_ID>/import-six/preview?mode=raw" \
  -F "file=@/path/to/computo.six"
```

### Import (Raw) con selezione preventivo

```bash
curl -sS -X POST "http://localhost:3000/api/projects/<PROJECT_ID>/import-six?mode=raw" \
  -F "file=@/path/to/computo.six" \
  -F "estimate_id=<PREVENTIVO_ID_DA_PREVIEW>"
```

## 11.3 — Offerte (import)

L’import offerta usa multipart. Esempio base (LX):

```bash
curl -sS -X POST "http://localhost:3000/api/projects/<PROJECT_ID>/offers?estimate_id=<BASELINE_ESTIMATE_ID>&mode=lx&company=Impresa%20Rossi&round_number=1" \
  -F "file=@/path/to/offerta.xlsx" \
  -F "company=Impresa Rossi" \
  -F "round_mode=auto" \
  -F "round_number=1" \
  -F "sheet_name=Offerta" \
  -F "code_columns=[\"Codice\"]" \
  -F "description_columns=[\"Descrizione\"]" \
  -F "price_column=Prezzo" \
  -F "quantity_column=Quantità" \
  -F "mode=lx" \
  -F "estimate_id=<BASELINE_ESTIMATE_ID>"
```

Nota:

- il server legge alcune informazioni anche dalla query string (per resilienza).

## 11.4 — Lettura offerte e voci

### Elenco offerte per baseline

```bash
curl -sS "http://localhost:3000/api/projects/<PROJECT_ID>/offers?estimate_id=<BASELINE_ESTIMATE_ID>"
```

### Voci baseline

```bash
curl -sS "http://localhost:3000/api/projects/<PROJECT_ID>/estimate/<BASELINE_ESTIMATE_ID>/items"
```

### Voci offerta (round + company)

```bash
curl -sS "http://localhost:3000/api/projects/<PROJECT_ID>/estimate/<BASELINE_ESTIMATE_ID>/items?round=1&company=Impresa%20Rossi"
```

## 11.5 — Pending resolution

### Lista pending

```bash
curl -sS "http://localhost:3000/api/projects/<PROJECT_ID>/offers/pending?estimate_id=<BASELINE_ESTIMATE_ID>&round=1&company=Impresa%20Rossi"
```

### Risolvi una pending (scegliendo PLI)

```bash
curl -sS -X PATCH "http://localhost:3000/api/projects/<PROJECT_ID>/offers/items/<OFFER_ITEM_ID>" \
  -H "Content-Type: application/json" \
  -d '{"price_list_item_id":"<PRICE_LIST_ITEM_ID>"}'
```

## 11.6 — Analytics

```bash
curl -sS "http://localhost:3000/api/projects/<PROJECT_ID>/analytics/stats?estimate_id=<BASELINE_ESTIMATE_ID>"
```

