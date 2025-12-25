# 05 — Import Computo: il tuo primo import SIX

Benvenuto al quinto capitolo! Qui imparerai come importare un **computo di progetto** da file SIX/XML. Questo è lo step fondamentale: il computo diventa la **baseline** su cui si confronteranno tutte le offerte.

**Tempo stimato:** 30-45 minuti (lettura + primo import)

---

## Cosa viene importato

Quando importi un file `.six` o `.xml`, Taboolo crea:

| Elemento | Descrizione |
|----------|-------------|
| **Preventivo baseline** | Testata del computo (nome, tipo `project`) |
| **Voci del computo** | Righe con quantità, descrizioni, prezzi |
| **WBS** | Albero gerarchico per categorizzare le lavorazioni |
| **Listino** | Voci con codice/descrizione/prezzo associate al preventivo |

Dopo l'import potrai:

- Aprire il preventivo → vedere le voci in "Dettaglio Preventivo"
- Aprire il listino → vedere le voci e i totali
- Usare il filtro WBS in varie pagine

---

## Prerequisiti

Prima di iniziare, assicurati di avere:

1. ✅ L'applicazione Taboolo funzionante (vedi [01-quickstart](01-quickstart.md))
2. ✅ Un progetto creato dove importare il computo
3. ✅ Un file `.six` o `.xml` esportato da STR Vision (o software equivalente)
4. ✅ Il servizio Python importer in esecuzione

---

## Passo 1: Accedi all'import

1. Apri un progetto esistente (o creane uno nuovo)
2. Clicca **Importa Dati** nella pagina del progetto
3. Seleziona il tab **"Import Computo (SIX/XML)"**

La schermata mostra un'area di upload per caricare il file.

---

## Passo 2: Carica il file

Puoi:

- **Trascinare** il file nell'area di upload
- **Cliccare** per selezionare il file dal filesystem

Formati supportati:

- `.six` — formato nativo STR Vision
- `.xml` — export XML compatibile

Dopo il caricamento, Taboolo esegue una **preview** automatica.

---

## Passo 3: Seleziona il preventivo

Molti file SIX/XML possono contenere **più preventivi** o sezioni. La preview mostra:

- Elenco dei preventivi trovati
- Descrizione/codice di ciascuno
- Numero di voci per preventivo

**Cosa fare:**

- Se vedi più preventivi, apri il menu e scegli quello che ti interessa
- Di solito è quello **principale** del progetto
- Se il file contiene un solo preventivo, viene selezionato automaticamente

> 💡 **Consiglio**: controlla il numero di voci nella preview. Se è 0 o molto basso, potresti aver selezionato la sezione sbagliata.

---

## Passo 4: Conferma l'import

Clicca **"Conferma Importazione"**.

Vedrai una barra di avanzamento. I tempi dipendono da:

- Dimensione del file
- Numero di voci (può essere migliaia)
- Complessità della struttura WBS

Per file tipici (1000-5000 voci): 10-30 secondi.

---

## Passo 5: Verifica il risultato

Dopo l'import, controlla questi punti:

### Checklist di verifica

| Cosa controllare | Dove | Cosa devi vedere |
|------------------|------|------------------|
| Preventivo creato | Lista preventivi del progetto | Una riga "Preventivo di progetto" |
| Totale plausibile | Dashboard preventivo | Importo totale ragionevole |
| Voci presenti | Dettaglio Preventivo | Tabella con righe |
| Listino popolato | Listino | Voci con codici e prezzi |
| WBS funzionante | Sidebar WBS | Nodi albero (WBS1-WBS7) |

Se qualcosa non torna, vai al [Troubleshooting](../reference/troubleshooting.md).

---

## Cosa succede dietro le quinte

Quando clicchi "Conferma Importazione", questo è il flusso:

```
┌────────────────────────────────────────────────────────────┐
│                       FRONTEND                              │
│  1. Invia file multipart a Nitro                           │
└──────────────────────┬─────────────────────────────────────┘
                       │
┌──────────────────────▼─────────────────────────────────────┐
│                    NITRO (Backend)                          │
│  2. Proxy multipart a Python                                │
│  3. Riceve payload JSON parsato                             │
│  4. Mappa/normalizza i dati                                 │
│  5. Persiste su MongoDB                                     │
└──────────────────────┬─────────────────────────────────────┘
                       │
┌──────────────────────▼─────────────────────────────────────┐
│                    PYTHON IMPORTER                          │
│  2.1 Parsa file SIX/XML                                     │
│  2.2 Estrae WBS, listino, voci                              │
│  2.3 Filtra solo WBS usati (ottimizzazione)                 │
│  2.4 Ritorna JSON strutturato                               │
└────────────────────────────────────────────────────────────┘
```

### Ottimizzazione WBS

I file SIX esportati spesso contengono l'**intera struttura WBS aziendale** (migliaia di nodi), anche se il progetto ne usa solo 20.

Il parser Python **filtra attivamente**:

1. Raccoglie gli ID WBS citati nelle misurazioni (righe)
2. Raccoglie gli ID WBS citati nei prodotti (listino)
3. Restituisce **solo** i nodi usati

Questo riduce drasticamente dimensione JSON e tempo di scrittura DB.

### Persistenza (cosa viene scritto su MongoDB)

Ordine di persistenza:

1. **WbsNode** — Nodi della gerarchia WBS
2. **PriceList** — Testata listino
3. **PriceListItem** — Voci del listino (solo quelle usate nel computo)
4. **Estimate** — Testata preventivo (type = 'project')
5. **EstimateItem** — Righe del computo

> ⚠️ **Il re-import sovrascrive**: se importi di nuovo lo stesso file, i dati esistenti vengono cancellati e ricreati. Non si accumulano duplicati.

---

## Errori comuni e soluzioni

### "Errore durante l'analisi del file"

**Cause tipiche:**

- File corrotto o non valido
- Servizio Python non raggiungibile
- Timeout (file troppo grande)

**Cosa fare:**

1. Riprova (a volte è un problema temporaneo)
2. Esporta nuovamente il file da STR Vision
3. Verifica che il servizio Python sia attivo (`http://localhost:8000/docs`)
4. Se persiste, controlla i log nel terminale di Python

### "Import completato ma vedo poche voci"

**Cause tipiche:**

- Hai selezionato un preventivo diverso da quello atteso
- Il file contiene più sezioni e stai importando quella "sbagliata"

**Cosa fare:**

1. Ripeti l'import selezionando un altro preventivo dalla preview
2. Confronta il numero voci nella preview vs quelle importate

### "Totali a 0 o palesemente errati"

**Cause tipiche:**

- Quantità o prezzi mancanti nel file sorgente
- Listino non popolato correttamente

**Cosa fare:**

1. Apri il Listino e verifica la colonna "Prezzo Unit."
2. Apri il Dettaglio Preventivo e controlla le prime righe
3. Se i prezzi mancano nel file sorgente, serve correggere l'export

---

## Endpoint e file coinvolti

### Frontend

| File | Ruolo |
|------|-------|
| `app/pages/projects/[id]/import/index.vue` | Pagina wizard import |
| `app/components/import/SixImportWizard.vue` | Wizard specifico SIX |

### Backend (Nitro)

| File | Endpoint |
|------|----------|
| `server/api/projects/[id]/import-six/preview.post.ts` | `POST /api/projects/:id/import-six/preview` |
| `server/api/projects/[id]/import-six.post.ts` | `POST /api/projects/:id/import-six` |
| `server/importers/python-six/client.ts` | Client per comunicare con Python |
| `server/services/ImportPersistenceService.ts` | Logica di persistenza |

### Python

| File | Ruolo |
|------|-------|
| `services/importer/api/endpoints/raw.py` | Endpoint import SIX raw |
| `services/importer/parsers/six/parser.py` | Parser file SIX/XML |

---

## Esercizi pratici

### Esercizio 1: Il tuo primo import

1. Crea un progetto di test "Test Import SIX"
2. Scarica o usa un file SIX di esempio
3. Importa il computo
4. Verifica:
   - Quante voci sono state importate?
   - Il totale ha senso?
   - La WBS mostra dei nodi?

### Esercizio 2: Esplora il database

Dopo l'import, usa MongoDB Compass o mongosh per verificare:

```javascript
// Conta le voci importate
db.estimateitems.countDocuments({ project_id: ObjectId("...") })

// Vedi le prime 5 voci
db.estimateitems.find({ project_id: ObjectId("...") }).limit(5).pretty()

// Conta i nodi WBS
db.wbsnodes.countDocuments({ project_id: ObjectId("...") })
```

### Esercizio 3: Re-import

1. Importa lo stesso file una seconda volta
2. Verifica che il numero di voci sia **uguale** (non raddoppiato)
3. Questo conferma che il meccanismo delete+insert funziona

---

## Prossimi passi

Ora che hai importato la baseline, puoi importare le offerte delle imprese!

**Prossimo capitolo:** [06 — Import Offerte: caricare Excel e collegarli alla baseline](06-import-offerte.md)

---

*Ricorda: la baseline è il punto di riferimento. Tutte le offerte verranno confrontate con essa.*
