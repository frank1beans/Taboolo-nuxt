# Import Computo (Baseline)

Il **computo** è il preventivo originale del progetto. Diventa il tuo riferimento (baseline) per confrontare le offerte.

---

## Formati Supportati

| Software | Formato | Estensione |
|----------|---------|------------|
| STR Vision | SIX/XML | `.six`, `.xml` |
| PriMus / ACCA | XPWE | `.xpwe` |

---

## Come Accedere all'Import

### Opzione 1: Dal menu
1. Clicca **"Importazione"** nella sidebar
2. Seleziona il progetto di destinazione
3. Scegli il tipo di file

### Opzione 2: Dal progetto
1. Apri il progetto
2. Clicca **"Importa"**

---

## Importare da STR Vision (SIX/XML)

### Passo 1: Carica il File
1. Apri la tab **"Computo SIX"**
2. Trascina il file `.six` o `.xml` nell'area di upload
3. Aspetta che si carichi

### Passo 2: Scegli il Preventivo
Il file può contenere più preventivi. Il sistema ti mostra:
- Nome di ogni preventivo
- Importo totale
- Numero di voci

**Seleziona quello che vuoi importare.**

### Passo 3: Opzioni

| Opzione | Cosa fa | Consigliato? |
|---------|---------|--------------|
| **Embeddings** | Abilita ricerca intelligente e mappe | ✅ Sì |

> **Cos'è l'embedding?** È una tecnologia che permette a Taboolo di capire il significato delle voci, non solo le parole esatte. Utile per la ricerca e le analytics.

### Passo 4: Conferma
1. Clicca **"Importa"**
2. Attendi (può richiedere qualche minuto per file grandi)
3. Fatto! 🎉

---

## Importare da PriMus/ACCA (XPWE)

### Passo 1: Carica il File
1. Apri la tab **"Computo XPWE"**
2. Trascina il file `.xpwe`

### Passo 2: Scegli il Preventivo
Come per SIX, seleziona il preventivo da importare.

### Passo 3: Mappa la WBS ⚠️

Questa è la parte importante. Devi dire a Taboolo come organizzare i livelli del file:

**Esempio:**
```
Livello 1 nel file → WBS 01 (es. "Opere civili")
Livello 2 nel file → WBS 02 (es. "Strutture")
Livello 3 nel file → WBS 03 (es. "Fondazioni")
Livello 4 nel file → Ignora (non mi serve)
```

**Opzioni per ogni livello:**
- **WBS 01-07:** Associa al livello corrispondente
- **Ignora:** Non importare questo livello

### Passo 4: Conferma
1. Attiva **Embeddings** se vuoi
2. Clicca **"Importa"**
3. Attendi il completamento

---

## Cosa Succede Dopo l'Import

Taboolo crea automaticamente:

| Elemento | Descrizione |
|----------|-------------|
| **Preventivo** | Il documento con i totali |
| **Listino** | L'elenco delle voci con prezzi |
| **WBS** | La struttura organizzativa |
| **Voci** | Ogni riga del computo |

---

## Verificare l'Import

1. Vai alla **Dashboard del progetto**
2. Trovi il preventivo nella lista
3. Cliccalo per verificare:
   - ✅ Numero voci corretto
   - ✅ Importo totale giusto
   - ✅ WBS ben organizzata

---

## 💡 Suggerimenti

> **Attiva sempre gli embeddings** se vuoi usare la mappa semantica e la ricerca intelligente.

> **File grande non carica?** Contatta l'amministratore per aumentare il limite di upload.

> **Puoi importare più preventivi** nello stesso progetto (es. versioni diverse, varianti).

---

## Problemi Comuni

### L'import fallisce
- Verifica che il file non sia corrotto
- Assicurati che il servizio Python sia attivo
- Per file grandi, potrebbe servire più tempo

### Le voci non hanno la WBS
- Per XPWE: controlla la mappatura dei livelli
- Per SIX: la WBS viene dal file stesso

### Mancano alcune voci
- Il file potrebbe avere più preventivi
- Verifica di aver selezionato quello giusto

---

## Prossimo Passo

Ora che hai il preventivo baseline, puoi:

👉 [Import Offerte](05-import-offerte.md) - Importa le offerte dei fornitori

Oppure:
👉 [Listino e Catalogo](07-listino-catalogo.md) - Visualizza le voci importate
