# Taboolo — Corso Completo di Programmazione Full-Stack

Benvenuto! Questa è la guida definitiva per imparare a costruire, estendere e mantenere **Taboolo**, un'applicazione web full-stack per la gestione di preventivi e offerte di gara nel settore edile.

Questa documentazione non è un semplice manuale tecnico: è un **corso di programmazione completo**, pensato per accompagnarti passo dopo passo dalla totale inesperienza fino alla padronanza del sistema.

---

## A chi è rivolto questo corso

### Sei alle prime armi? Perfetto!

Questo corso è pensato per te. Non diamo nulla per scontato:

- **Se non hai mai usato JavaScript**: troverai spiegazioni dettagliate, confronti con Python (se lo conosci), e tanti esempi pratici
- **Se non conosci Vue o Nuxt**: partiamo da zero, spiegando ogni concetto con calma e verbosità
- **Se MongoDB ti è nuovo**: ti guideremo attraverso schemi, query e aggregazioni con esempi reali

### Sei già uno sviluppatore? 

Puoi saltare alle sezioni che ti interessano, ma ti consigliamo comunque di dare un'occhiata al capitolo sull'architettura: Taboolo ha alcune scelte progettuali specifiche che è utile conoscere.

---

## Cosa imparerai

Al termine di questo corso sarai in grado di:

1. **Comprendere** l'architettura di un'applicazione web moderna (frontend + backend + database)
2. **Navigare** nel codice sorgente con sicurezza, sapendo dove trovare ogni componente
3. **Modificare** ed estendere le funzionalità esistenti
4. **Debuggare** problemi comuni con metodologia
5. **Ricostruire** parti del sistema da zero, non copiando a memoria ma capendo il "perché"

---

## Cos'è Taboolo

Taboolo è un'applicazione per **gestire preventivi di progetto** e **ritorni di gara (offerte)**, con l'obiettivo di:

- Importare un **computo di progetto** (baseline) da file **SIX/XML** — il formato standard usato in edilizia
- Importare una o più **offerte** (per impresa e round di gara) da file **Excel**
- **Confrontare** le offerte rispetto al progetto (delta prezzi, migliori offerte, analisi per categoria di lavoro)
- **Analizzare** i prezzi con algoritmi avanzati (embedding, clustering, outlier detection)

### Perché esiste Taboolo?

Nel mondo dei cantieri edili, i **quantity surveyor** e i **project manager** ricevono preventivi da decine di imprese, spesso in formati diversi (Excel, PDF, software proprietari). Confrontarli manualmente è un lavoro lungo, noioso e soggetto a errori.

Taboolo automatizza questo processo: importi i dati una volta, e il sistema ti mostra immediatamente dove un'impresa è più conveniente, dove ci sono prezzi anomali, e come si confronta ogni offerta rispetto al preventivo di base.

---

## Stack Tecnologico

Prima di iniziare, ecco le tecnologie che userai in questo corso:

### Frontend (ciò che l'utente vede)

| Tecnologia | Ruolo | Dove impararla |
|------------|-------|----------------|
| **Vue 3** | Framework UI reattivo | [Documentazione ufficiale](https://vuejs.org/guide/introduction.html) |
| **Nuxt 4** | Meta-framework per Vue | [Documentazione ufficiale](https://nuxt.com/docs) |
| **TypeScript** | JavaScript con tipi | [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/) |
| **Nuxt UI** | Componenti UI pre-costruiti | [Nuxt UI Docs](https://ui.nuxt.com/) |
| **AG Grid** | Tabelle dati avanzate | [AG Grid Docs](https://www.ag-grid.com/vue-data-grid/) |
| **Plotly.js** | Grafici e visualizzazioni | [Plotly JS Docs](https://plotly.com/javascript/) |

### Backend (la logica server-side)

| Tecnologia | Ruolo | Dove impararla |
|------------|-------|----------------|
| **Nitro** | Server API di Nuxt | [Nitro Docs](https://nitro.unjs.io/) |
| **H3** | HTTP handler minimale | [H3 Docs](https://h3.unjs.io/) |
| **Mongoose** | ODM per MongoDB | [Mongoose Docs](https://mongoosejs.com/docs/) |
| **MongoDB** | Database NoSQL | [MongoDB Manual](https://www.mongodb.com/docs/manual/) |

### Servizio Python (elaborazione file)

| Tecnologia | Ruolo | Dove impararla |
|------------|-------|----------------|
| **FastAPI** | Framework API Python | [FastAPI Docs](https://fastapi.tiangolo.com/) |
| **Pydantic** | Validazione dati | [Pydantic Docs](https://docs.pydantic.dev/) |
| **NumPy/Pandas** | Elaborazione numerica | [NumPy](https://numpy.org/doc/) / [Pandas](https://pandas.pydata.org/docs/) |

> 💡 **Non farti spaventare dalla lista!** Non devi conoscere tutto in anticipo. Questo corso ti guiderà nell'apprendimento di ogni tecnologia man mano che diventa necessaria.

---

## Architettura in un'occhiata

```
┌─────────────────────────────────────────────────────────────────┐
│                         🌐 BROWSER                              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Frontend (Nuxt/Vue)                   │   │
│  │  • Pages: routing automatico                             │   │
│  │  • Components: UI riutilizzabili                         │   │
│  │  • Composables: logica condivisa                         │   │
│  └──────────────────────┬──────────────────────────────────┘   │
│                         │ HTTP /api/*                           │
└─────────────────────────┼───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                      🖥️ NITRO SERVER                            │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │   server/api/    │  │  server/models/  │  │ server/utils │  │
│  │   REST endpoints │  │  Mongoose schemas│  │   helpers    │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────────────┘  │
│           │                     │                               │
│           │                     ▼                               │
│           │            ┌─────────────────┐                      │
│           │            │    MongoDB 🍃   │                      │
│           │            │  • Projects     │                      │
│           │            │  • Estimates    │                      │
│           │            │  • Items        │                      │
│           │            │  • Offers       │                      │
│           │            └─────────────────┘                      │
│           │                                                     │
│           ▼ multipart proxy                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │               🐍 PYTHON IMPORTER SERVICE                 │   │
│  │  • Parser SIX/XML                                        │   │
│  │  • Parser Excel                                          │   │
│  │  • Embedding generation                                  │   │
│  │  • Price analysis                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Concetti chiave da ricordare

1. **Il frontend non parla direttamente con Python**: tutto passa attraverso Nitro, che funge da proxy
2. **MongoDB è il database centrale**: tutti i dati persistono qui
3. **WBS e Listino sono "per-preventivo"**: ogni preventivo ha la sua gerarchia WBS e il suo listino

---

## Come navigare questa documentazione

Abbiamo organizzato i contenuti in **tre livelli progressivi**:

### 📚 Tutorial — Impara facendo

Percorso sequenziale pensato per chi parte da zero. Ogni capitolo costruisce sulle conoscenze del precedente.

**Da seguire in ordine:**

1. [Quickstart — Ambiente funzionante in 15 minuti](tutorial/01-quickstart.md)
2. [Fondamenti Web — JavaScript e TypeScript per chi viene da altri linguaggi](tutorial/02-fondamenti-web.md)
3. [Fondamenti Nuxt — Vue, Nuxt e il pattern delle Single File Components](tutorial/03-fondamenti-nuxt.md)
4. [Architettura Taboolo — Come è organizzato il progetto](tutorial/04-architettura.md)
5. [Import Computo — Il tuo primo import di un file SIX](tutorial/05-import-computo.md)
6. [Import Offerte — Caricare offerte Excel e collegarle al preventivo](tutorial/06-import-offerte.md)
7. [Dashboard e Griglia — Visualizzare e filtrare i dati](tutorial/07-dashboard.md)
8. [Analytics — UMAP, clustering e analisi prezzi](tutorial/08-analytics.md)

### 📖 Reference — Trova velocemente

Documentazione di consultazione rapida. Non devi leggerla tutta: usala come dizionario.

- [API Endpoints — Tutti gli endpoint REST con esempi curl](reference/api-endpoints.md)
- [Modello Dati — Schemi Mongoose e relazioni](reference/modello-dati.md)
- [Configurazione — Variabili d'ambiente e runtime config](reference/configurazione.md)
- [Query MongoDB — Aggregazioni utili per debug](reference/mongo-queries.md)
- [Componenti Frontend — Pagine e composables](reference/frontend-componenti.md)
- [Glossario — Terminologia di dominio](reference/glossario.md)
- [Troubleshooting — Problemi comuni e soluzioni](reference/troubleshooting.md)

### 🔬 Deep Dive — Approfondisci

Per chi vuole capire i meccanismi interni avanzati.

- [Python Importer — Architettura del servizio esterno](deep-dive/python-importer.md)
- [LLM Extraction — Estrazione strutturata con AI](deep-dive/llm-extraction.md)
- [Gravitational Clustering — Algoritmo di clustering semantico](deep-dive/gravitational-clustering.md)
- [Price Analysis — Stima prezzo equo e outlier detection](deep-dive/price-analysis.md)
- [Semantic Map — Visualizzazione UMAP e analytics](deep-dive/semantic-map.md)

---

## Il tuo primo passo

**Pronto a iniziare?**

👉 [Vai al Quickstart](tutorial/01-quickstart.md) — Avrai l'ambiente funzionante in 15 minuti

Se incontri problemi durante il setup, consulta il [Troubleshooting](reference/troubleshooting.md).

---

## Filosofia di questo corso

### Impara facendo

La programmazione non si impara solo leggendo: devi scrivere codice, fare errori, e capire perché non funziona. Per questo ogni capitolo contiene:

- **Esempi pratici** che puoi copiare e modificare
- **Punti di verifica** per controllare di aver capito
- **Suggerimenti** su cosa esplorare dopo

### Sbaglia senza paura

Questo è un ambiente sicuro: il codice è sotto version control (Git), puoi sempre tornare indietro. Anzi, ti incoraggiamo a:

- Cambiare cose per vedere cosa si rompe
- Aggiungere `console.log` ovunque per capire il flusso
- Sperimentare con query MongoDB diverse

### Fai domande

Se qualcosa non è chiaro, significa che la documentazione può essere migliorata. Segnala i punti confusi!

---

## Cosa serve per iniziare

**Requisiti minimi:**

- Computer con Windows, macOS o Linux
- Circa 5GB di spazio libero
- Connessione internet (per scaricare dipendenze)

**Conoscenze pregresse utili (ma non obbligatorie):**

- Familiarità base con la linea di comando (terminale)
- Concetti base di programmazione (variabili, funzioni, cicli)
- Se conosci Python, molti concetti saranno familiari

**Non serve:**

- Esperienza con JavaScript (lo imparerai qui)
- Conoscenza di Vue o React
- Esperienza con database

---

## Risorse esterne consigliate

Se vuoi approfondire oltre a questa documentazione:

### JavaScript/TypeScript
- [JavaScript.info](https://javascript.info/) — Il miglior tutorial JS gratuito
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/) — Guida ufficiale

### Vue 3
- [Vue School](https://vueschool.io/) — Video corsi (alcuni gratuiti)
- [Vue Mastery](https://www.vuemastery.com/) — Corsi avanzati

### MongoDB
- [MongoDB University](https://learn.mongodb.com/) — Corsi ufficiali gratuiti

### Generale
- [MDN Web Docs](https://developer.mozilla.org/) — La bibbia dello sviluppo web
- [Stack Overflow](https://stackoverflow.com/) — Quando sei bloccato

---

*Ultimo aggiornamento: Dicembre 2024*

*Buono studio! 🚀*
