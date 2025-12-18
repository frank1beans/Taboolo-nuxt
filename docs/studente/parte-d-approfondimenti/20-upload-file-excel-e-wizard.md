# 20 - Upload file, Excel e wizard di import (frontend)

Obiettivo: capire come il frontend gestisce upload e import, e come aggiungere/modificare un flusso di import senza rompere tutto.

In Taboolo l'import è una feature centrale, e ha due caratteristiche:

- è guidato (wizard): l'utente compila configurazioni (sheet, colonne, impresa, round)
- è "robusto": deve funzionare anche con file reali e imperfetti

## 20.1 - Concetto base: upload web = multipart/form-data

Quando invii un file dal browser, la forma più comune è:

- `multipart/form-data`

Significa:

- il body della richiesta contiene parti multiple
- una parte è il file (bytes + filename + mimetype)
- altre parti sono campi di form (stringhe)

In JS questo si costruisce con `FormData`:

```ts
const form = new FormData()
form.append('file', file, file.name)
form.append('company', 'ACME')
```

Nel backend Nitro, il multipart viene letto con `readMultipartFormData(event)` (vedi `server/utils/python-proxy.ts`).

## 20.2 - Pattern Taboolo: UI -> Nitro -> Python -> Nitro -> Mongo

Per import e parsing, Taboolo fa una scelta precisa:

1) il browser carica file verso `/api/...` (Nitro)
2) Nitro legge multipart e fa da proxy verso Python (`PYTHON_API_URL`)
3) Python parse-a e ritorna JSON
4) Nitro mappa/persiste su Mongo

Perché è utile:

- Python è più comodo per parsing complesso (Excel, formati legacy, normalizzazione)
- Nitro mantiene il ruolo di "integrazione e persistenza"

## 20.3 - Componenti frontend coinvolti (file reali)

Componenti UI:

- `app/components/ui/FileDropZone.vue`: selezione file con drag & drop + validazioni base
- `app/components/ui/ImportStatusCard.vue`: feedback stato (uploading/success/error)

Componenti import:

- `app/components/projects/ImportWizard.vue`: wizard multi-step (import offerte)
- `app/components/projects/ExcelOfferUpload.vue`: upload più semplice (in alcune viste/flussi)

Composables:

- `app/composables/useExcelReader.ts`: lettura Excel, sheet names, rilevamento header, auto-detect colonne

## 20.4 - Lettura Excel nel browser: perché si fa prima dell'upload

Nel wizard, prima di inviare il file al backend, il frontend legge:

- nomi dei fogli
- header (riga intestazioni)
- una preview delle prime righe

Questo serve per:

- far scegliere foglio e colonne all'utente
- evitare di fare "tentativi" sul backend
- ridurre round-trip inutili

File: `app/composables/useExcelReader.ts`

Pattern:

- legge `file.arrayBuffer()`
- usa la libreria `xlsx`
- tenta di identificare automaticamente la riga header (soglie su celle non vuote)
- restituisce `headers`, `sheets`, `headerRowIndex`, `previewRows`

## 20.5 - Auto-detect colonne: cosa fa e cosa NON fa

Sempre in `useExcelReader.ts` c'è `autoDetectColumns(headers)`.

Esempio:

- riconosce possibili colonne "codice" se header include `cod`, `art`, `n.`
- riconosce descrizione se include `desc`, `voce`, `lavor`
- riconosce prezzo/quantità/progressivo con pattern simili

Limite importante:

- è una euristica, non una verità
- l'utente deve poter correggere sempre

Quindi la UI deve:

- mostrare cosa è stato selezionato
- permettere override manuale

## 20.6 - Il wizard offerte: cosa decide l'utente

Nel file `app/components/projects/ImportWizard.vue` ci sono scelte tipiche:

- modalità: `lx` o `mx` (due formati/dialetti di ritorni)
- tipo upload: `single` / `batch` / `multi`
- per ogni file: impresa, foglio, header row, round, ecc.
- per ogni file: impresa, foglio, header row, round, ecc.
- mappatura colonne: codice/descrizione/prezzo/quantità

### 20.6.1 - Step 3: Mapping Interattivo (Editable Grid)

Una particolarità del Wizard è lo **Step 3**, dove l'utente mappa le colonne Excel (es. "Importo Lavori") sui campi Taboolo (es. "Prezzo Unitario").
Invece di usare tante select statiche, usiamo una **AG Grid Editabile** (`MappingStep.vue`):

- Colonna "Mapping": dropdown editabile (Cell Editor)
- Colonna "File originario": preview dei dati reali
- Vantaggio: l'utente vede subito se "Colonna F" contiene davvero dei prezzi.

In più, una cosa critica:

- selezione baseline (estimate) a cui collegare l'offerta

Se sbagli questo collegamento, tutto il confronto e il listino perdono significato.

## 20.7 - Validazioni frontend: cosa bloccare prima dell'upload

Esempi di controlli utili (Taboolo ne fa già alcuni):

- nessun file selezionato -> non proseguire
- impresa vuota -> non proseguire
- mancano colonne minime:
  - almeno codice o descrizione
  - prezzo e quantità (a seconda del formato)

Nota: queste validazioni non sostituiscono quelle backend. Sono solo UX.

## 20.8 - Debug di un upload (checklist veloce)

Quando un import "non funziona", non indovinare: verifica in quest'ordine.

1) Frontend:
   - la UI ha costruito i campi corretti? (company, round, colonne)
   - il file è quello giusto? (sheet corretto)
2) Network tab:
   - request è `multipart/form-data`?
   - endpoint giusto (`/api/projects/:id/offers` o import-six)?
   - status code? payload di errore?
3) Nitro logs:
   - il proxy verso Python fallisce? (base URL errato, 502, timeout)
4) Python logs:
   - parsing fallisce per sheet/colonne?
   - file troppo grande? rate limit?

Se segui questo flusso, risolvi il 90% dei problemi in pochi minuti.

## 20.9 - Esercizio pratico: aggiungere una nuova opzione di mapping

Scenario: vuoi aggiungere un campo opzionale "note" all'import offerte.

Passi:

1) UI:
   - aggiungi una riga in mapping (wizard) o un selettore colonna
2) Payload:
   - assicurati che venga inviato come field multipart (string)
3) Python:
   - estendi parser/normalizzazione per leggere quella colonna
4) Nitro:
   - aggiorna mapper e persistenza per salvare il campo (se richiesto dal dominio)

Questo esercizio ti allena su un flusso completo multi-linguaggio (Vue -> Nitro -> Python -> Mongo).
