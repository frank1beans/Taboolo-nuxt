# 06 — Import Offerte: caricare Excel e collegarli alla baseline

Questo capitolo spiega come importare un **ritorno d'offerta** da file Excel e collegarlo alla baseline.

**Tempo stimato:** 20-30 minuti

---

## Prima di importare: controlla la baseline

Le offerte si **agganciano sempre** a un preventivo di progetto (baseline).

**Ordine corretto:**

1. ✅ Importa prima il computo SIX/XML (vedi [05-import-computo](05-import-computo.md))
2. ✅ Verifica che il preventivo compaia nel progetto
3. ✅ Solo dopo importa le offerte

> ⚠️ Se importi un'offerta senza baseline, non potrai confrontarla con nulla!

---

## Due modalità di import: LX vs MX

Taboolo supporta due modalità a seconda di come è strutturato il tuo Excel.

### LX — Offerta aggregata (per listino)

| Caratteristica | Dettaglio |
|----------------|-----------|
| **Aggancio** | Per **codice** o **descrizione** al listino |
| **Quando usarla** | Excel "sintetico" per voce di listino |
| **Pro** | Funziona anche senza progressivi |
| **Contro** | Alcune righe possono essere ambigue → stato **pending** |

### MX — Offerta dettagliata (per computo)

| Caratteristica | Dettaglio |
|----------------|-----------|
| **Aggancio** | Per **progressivo** alle righe del computo baseline |
| **Quando usarla** | Excel con stessa struttura del computo (riga per riga) |
| **Pro** | Confronto preciso per ogni riga |
| **Contro** | Se i progressivi non coincidono, righe non agganciate |

> 💡 **Consiglio**: se hai dubbi, inizia con **LX**. È più flessibile.

---

## Il wizard di import

### Dove trovarlo

`Progetto → Importa Dati → tab "Import Offerta (Excel)"`

### Step 1: Configurazione

Scegli:

- **Baseline**: il preventivo a cui agganciare l'offerta
- **Modalità**: LX o MX
- **Tipo upload**: File singolo (consigliato per iniziare)

### Step 2: File e metadati

1. Carica il file Excel
2. Seleziona il **foglio** (sheet) corretto
3. Compila:
   - **Impresa** (obbligatoria)
   - **Round** (default: 1)

### Step 3: Mappatura colonne

Indica quali colonne Excel corrispondono a quali campi:

| Campo | Obbligatorio? | Note |
|-------|---------------|------|
| **Codice** | Almeno uno tra Codice e Descrizione | Per match su listino |
| **Descrizione** | Almeno uno tra Codice e Descrizione | Per match se manca codice |
| **Prezzo** | ✅ Sì | Prezzo unitario proposto |
| **Quantità** | ✅ Sì | Quantità |
| **Progressivo** | Solo MX | Per match su righe baseline |

---

## Dopo l'import

Se l'import ha successo:

- Nella dashboard preventivo compare una nuova **offerta** con impresa/round/totale
- Puoi aprire:
  - **Dettaglio Offerta** — voci filtrate per round/impresa
  - **Confronto** — affiancamento colonne tra imprese
  - **Listino** — con vista offerta

---

## Voci "pending" (da risolvere)

In modalità LX, alcune righe potrebbero finire in stato **pending** quando:

- Il match codice/descrizione non è univoco
- La descrizione è troppo generica
- Nel listino ci sono duplicati simili

**Come risolvere:**

1. Vai nella pagina **Listino**
2. Apri il pannello "Voci da risolvere"
3. Scegli manualmente il codice corretto per ogni riga

Vedi anche [Troubleshooting](../reference/troubleshooting.md).

---

## Prossimo capitolo

[07 — Dashboard e Griglia: visualizzare e filtrare i dati](07-dashboard.md)
