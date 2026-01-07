# Import Offerte Excel

Le offerte dei fornitori arrivano di solito come file Excel. Ecco come importarle in Taboolo.

---

## Prima di Iniziare

Assicurati di avere:
- ✅ Un **progetto** già creato
- ✅ Un **preventivo baseline** importato (il computo)
- ✅ Il **file Excel** dell'offerta (`.xlsx` o `.xls`)

---

## Le Due Modalità

### LX - Lista Aggregata
Usala quando l'offerta è una **lista prezzi semplice**:
- Una riga = una voce
- Match per codice o descrizione

**Ideale per:** Offerte sintetiche, listini prezzi

### MX - Computo Dettagliato
Usala quando l'offerta segue la **struttura del computo**:
- Match per numero di riga (progressivo)
- Segue l'ordine del preventivo

**Ideale per:** Offerte analitiche, computi dettagliati

**Non sai quale scegliere?** Guarda il file Excel:
- Se ha codici chiari → **LX**
- Se segue l'ordine del computo → **MX**

---

## Importare un'Offerta (Passo per Passo)

### Step 1: Configurazione

1. Vai a **Importazione** → seleziona il progetto
2. Apri la tab **"Offerta Excel"**

3. **Seleziona il preventivo baseline**
   - A quale computo si riferisce questa offerta?

4. **Scegli la modalità** (LX o MX)

5. **Tipo di caricamento:**

| Tipo | Quando usarlo |
|------|---------------|
| **File singolo** | 1 file = 1 offerta di 1 fornitore |
| **File multipli** | Più file con la stessa struttura |
| **Multi-impresa** | 1 file con colonne per più fornitori |

---

### Step 2: Carica il File

1. **Trascina il file Excel** nell'area di upload
2. **Seleziona il foglio** giusto (se ce ne sono più di uno)
3. **Inserisci i dati:**
   - **Nome impresa:** es. "Edilizia Rossi Srl"
   - **Round:** 1° giro, 2° giro, ecc.

4. **Controlla l'anteprima** delle prime righe

---

### Step 3: Mappa le Colonne

Questa è la parte cruciale. Devi dire a Taboolo quali colonne contengono cosa.

#### Colonne Obbligatorie

| Campo | A cosa serve |
|-------|--------------|
| **Prezzo** | Il prezzo unitario offerto |
| **Quantità** | La quantità offerta |

#### Colonne per l'Aggancio

Serve **almeno una** di queste:

| Campo | Per la modalità |
|-------|-----------------|
| **Codice** | LX (match esatto) |
| **Descrizione** | LX (match per testo) |
| **Progressivo** | MX (match per numero riga) |

**Esempio di mappatura:**
```
Colonna A (Excel) → Codice
Colonna B (Excel) → Descrizione
Colonna F (Excel) → Prezzo
Colonna G (Excel) → Quantità
```

---

### Step 4: Conferma Import

1. Clicca **"Importa"**
2. Il sistema:
   - Crea l'offerta
   - Collega le voci al baseline
   - Genera gli alert per le differenze

---

## Dopo l'Import

### Voci Collegate
Taboolo trova automaticamente la corrispondenza tra offerta e baseline.

### Voci Addendum
Se una voce dell'offerta non esiste nel baseline:
- Viene marcata come **addendum** (voce aggiuntiva)
- Appare negli alert

### Alert Generati
Taboolo ti segnala le differenze. Vai a [Conflitti e Alert](09-conflitti-alert.md) per risolverle.

---

## 💡 Suggerimenti Pratici

### Per modalità LX
> I **codici devono corrispondere** esattamente a quelli del listino.
> Se sono diversi (es. "PAV-001" vs "PAV001"), otterrai alert.

### Per modalità MX
> Il **progressivo** deve essere uguale al numero di riga del computo.
> L'ordine delle righe è importante!

### In generale
> **Controlla l'intestazione:** la prima riga è il titolo o sono già dati?
> **Evita righe vuote:** possono causare problemi
> **Formati puliti:** meglio senza formattazioni complesse

---

## Casi Speciali

### Più Fogli nello Stesso File
Nello Step 2, seleziona il foglio corretto dal menu a tendina.

### Più Giri di Gara
Importa ogni round separatamente, indicando il numero corretto (1, 2, 3...).

### Stessa Impresa, Round Diversi
Ogni import crea un'offerta separata. Puoi confrontarle insieme dopo.

### Multi-Impresa
Se un solo file contiene le offerte di più imprese:
1. Scegli **"Multi-impresa"** nello Step 1
2. Mappa le colonne prezzo/quantità per ogni impresa

---

## Problemi Comuni

### "Import fallito: nessun match trovato"
- Controlla che i codici corrispondano
- Verifica la mappatura colonne
- Assicurati di aver scelto la modalità giusta (LX/MX)

### "Troppi addendum"
- I codici non corrispondono al baseline
- Prova a usare la colonna "Descrizione" invece di "Codice"

### "Quantità sempre zero"
- Hai mappato la colonna sbagliata
- Controlla che sia una colonna numerica

---

## Prossimo Passo

Dopo l'import, è il momento di:

👉 [Confronto Offerte](06-confronto-offerte.md) - Vedi le differenze tra baseline e offerte

👉 [Conflitti e Alert](09-conflitti-alert.md) - Risolvi le discrepanze trovate
