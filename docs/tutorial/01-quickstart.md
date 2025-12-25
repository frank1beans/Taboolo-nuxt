# 01 — Quickstart: Da Zero a Ambiente Funzionante

Benvenuto al primo capitolo pratico del corso! L'obiettivo di questa guida è portarti da "ho appena clonato la repository" a "ho un ambiente completamente funzionante e riesco a vedere l'applicazione nel browser".

Non preoccuparti se sei alle prime armi: spiegheremo ogni passaggio in dettaglio, con note su cosa sta succedendo "dietro le quinte" e come risolvere i problemi più comuni.

**Tempo stimato:** 15-30 minuti (dipende dalla velocità della tua connessione internet)

---

## Prerequisiti: cosa devi avere sul tuo computer

Prima di iniziare, assicuriamoci che il tuo computer abbia tutto il necessario. Non preoccuparti, sono tutti strumenti gratuiti e facili da installare.

### 1. Git — Il sistema di versionamento

**Cos'è Git?**

Git è un sistema che tiene traccia di tutte le modifiche al codice. Ogni volta che qualcuno cambia un file, Git registra: chi l'ha cambiato, quando, e cosa è stato modificato. Questo permette di:

- Tornare indietro nel tempo se qualcosa si rompe
- Lavorare in più persone sullo stesso progetto senza sovrascriversi
- Vedere la "storia" di ogni file

**Come verificare se ce l'hai:**

Apri un terminale (PowerShell su Windows, Terminal su Mac) e scrivi:

```bash
git --version
```

Dovresti vedere qualcosa tipo `git version 2.43.0`. La versione esatta non è importante, basta che il comando funzioni.

**Se non ce l'hai:**

- **Windows**: Scarica da [git-scm.com](https://git-scm.com/downloads) e installa (premi sempre "Next")
- **Mac**: Installa Xcode Command Line Tools con `xcode-select --install`
- **Linux**: `sudo apt install git` (Ubuntu/Debian) o `sudo dnf install git` (Fedora)

---

### 2. Node.js — L'ambiente di esecuzione JavaScript

**Cos'è Node.js?**

Node.js è un programma che esegue JavaScript al di fuori del browser. Mentre nel browser JavaScript fa muovere bottoni e caricare pagine, con Node puoi:

- Costruire server web
- Eseguire script di automazione
- Far funzionare tutti gli strumenti di sviluppo moderni (come Nuxt)

**Che versione serve?**

Consigliamo una versione **LTS** (Long Term Support), che significa "stabile e supportata a lungo". Al momento, Node 18 o 20 vanno benissimo.

**Come verificare:**

```bash
node --version
```

Dovresti vedere qualcosa come `v20.10.0`.

**Se non ce l'hai o è troppo vecchio:**

Consigliamo di usare **nvm** (Node Version Manager), che ti permette di avere più versioni di Node e passare da una all'altra:

- **Windows**: Scarica [nvm-windows](https://github.com/coreybutler/nvm-windows/releases)
- **Mac/Linux**: Segui le istruzioni su [nvm](https://github.com/nvm-sh/nvm)

Poi:

```bash
nvm install --lts
nvm use --lts
```

---

### 3. pnpm — Il gestore di pacchetti

**Cos'è un "gestore di pacchetti"?**

Quando scrivi un'applicazione, non parti da zero: usi librerie scritte da altri (per esempio, Vue per l'interfaccia, Mongoose per il database). Un gestore di pacchetti:

- Scarica queste librerie da internet
- Le organizza nella cartella `node_modules/`
- Tiene traccia delle versioni in un file (`pnpm-lock.yaml`)

**Perché pnpm e non npm?**

`npm` è il gestore di pacchetti standard di Node, ma `pnpm` è:

- **Più veloce**: usa link simbolici invece di copiare file
- **Più efficiente**: non duplica pacchetti usati da più progetti
- **Più rigoroso**: evita alcuni problemi di dipendenze

Questa repository usa pnpm, quindi devi installarlo.

**Come verificare:**

```bash
pnpm --version
```

**Se non ce l'hai:**

```bash
npm install -g pnpm
```

Oppure, se hai già corepack (incluso in Node 16+):

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

---

### 4. MongoDB — Il database

**Cos'è MongoDB?**

MongoDB è un database "NoSQL" che salva dati come documenti JSON (simili a dizionari Python o oggetti JavaScript). A differenza dei database tradizionali con tabelle fisse, MongoDB è flessibile: puoi aggiungere campi a un documento senza modificare uno "schema".

**Hai due opzioni:**

**Opzione A: MongoDB locale (consigliata per semplicità)**

1. Scarica MongoDB Community Server da [mongodb.com](https://www.mongodb.com/try/download/community)
2. Installa seguendo le istruzioni
3. Avvia il servizio (su Windows parte automaticamente, su Mac/Linux: `sudo systemctl start mongod`)

**Opzione B: Docker (se lo conosci già)**

```bash
docker run -d --name mongo -p 27017:27017 mongo:7
```

**Come verificare che funzioni:**

```bash
# Se hai installato MongoDB Shell (mongosh)
mongosh --eval "db.runCommand({ ping: 1 })"
```

Dovresti vedere `{ ok: 1 }`.

---

### 5. Python — Per il servizio di import

**Perché serve Python?**

Taboolo usa un servizio separato scritto in Python per:

- Parsare file SIX/XML (il formato usato nel settore edile)
- Elaborare file Excel delle offerte
- Generare embedding per l'analisi semantica

**Che versione serve?**

Python 3.10 o superiore.

**Come verificare:**

```bash
python --version
# oppure su alcuni sistemi
python3 --version
```

**Se non ce l'hai:**

- **Windows**: Scarica da [python.org](https://www.python.org/downloads/) — **IMPORTANTE**: durante l'installazione, spunta "Add Python to PATH"
- **Mac**: `brew install python` (se hai Homebrew) o scarica da python.org
- **Linux**: Di solito è già installato, altrimenti `sudo apt install python3`

---

## Checklist di verifica

Prima di procedere, assicurati che tutti i comandi funzionino:

```bash
# Esegui tutti questi comandi nel terminale
git --version      # ✓ git version 2.x.x
node --version     # ✓ v18.x.x o v20.x.x
pnpm --version     # ✓ 8.x.x o 9.x.x
python --version   # ✓ Python 3.10+
```

Se anche solo uno di questi fallisce, torna alla sezione corrispondente e risolvi prima di continuare.

---

## Clonare la repository

Ora che hai tutti gli strumenti, è il momento di scaricare il codice.

### Che cos'è "clonare"?

"Clonare" una repository significa scaricare tutto il codice e la sua storia (tutti i commit) sul tuo computer. È diverso da un semplice download: avrai un vero repository Git locale, quindi potrai:

- Vedere chi ha fatto ogni modifica
- Creare nuovi branch
- Fare commit delle tue modifiche

### Comando

Scegli una cartella dove vuoi tenere il progetto. Per esempio, `C:\Progetti\` su Windows o `~/Progetti/` su Mac/Linux.

```bash
# Vai nella cartella scelta
cd ~/Progetti

# Clona la repository
git clone <URL_REPOSITORY> Taboolo-nuxt

# Entra nella cartella
cd Taboolo-nuxt
```

> 💡 **Nota**: sostituisci `<URL_REPOSITORY>` con l'URL effettivo che ti è stato fornito.

### Cosa vedrai dopo il clone

```
Taboolo-nuxt/
├── app/                    # Frontend (pagine, componenti, stili)
├── server/                 # Backend (API, modelli, servizi)
├── services/               # Servizi esterni (Python importer)
├── docs/                   # Questa documentazione!
├── package.json            # Dipendenze e script
├── pnpm-lock.yaml          # Versioni esatte delle dipendenze
├── nuxt.config.ts          # Configurazione Nuxt
└── .env.example            # Template variabili d'ambiente
```

---

## Installare le dipendenze

### Step 1: Installa i pacchetti Node

Dalla cartella principale del progetto:

```bash
pnpm install
```

**Cosa sta succedendo?**

1. pnpm legge `package.json` per vedere quali librerie servono
2. Consulta `pnpm-lock.yaml` per sapere le versioni esatte
3. Scarica le librerie da internet (la prima volta può essere lento)
4. Le mette in `node_modules/`
5. Esegue `nuxt prepare` per generare i tipi TypeScript

**Quanto tempo ci vuole?**

La prima volta: 2-5 minuti (dipende dalla connessione).
Le volte successive: pochi secondi (pnpm usa una cache).

**Errori comuni:**

| Errore | Causa probabile | Soluzione |
|--------|-----------------|-----------|
| `EACCES: permission denied` | Problemi di permessi | Non usare `sudo`, correggi i permessi di npm/pnpm |
| `ENETUNREACH` | Problema di rete | Verifica connessione internet |
| `ERR_SOCKET_TIMEOUT` | Download troppo lento | Riprova, o usa un mirror |
| `node_modules appears empty` | Installazione interrotta | Cancella `node_modules/` e riprova |

**Rimedio universale quando non sai cosa fare:**

```bash
# Chiudi tutti i terminali e gli editor
# Poi:
rm -rf node_modules
pnpm install
```

---

### Step 2: Configura le variabili d'ambiente

Taboolo usa variabili d'ambiente per configurazioni sensibili (password, URL, chiavi API). Queste NON sono nel repository Git per motivi di sicurezza.

**Crea il file `.env`:**

```bash
# Copia il template
cp .env.example .env
```

**Modifica `.env`:**

Apri il file con un editor di testo e imposta almeno:

```env
# Database MongoDB
MONGODB_URI=mongodb://localhost:27017/taboolo

# URL del servizio Python
PYTHON_API_URL=http://localhost:8000/api/v1

# (Opzionale) Chiavi API per embedding/LLM
JINA_API_KEY=...
OPENAI_API_KEY=...
```

> 💡 **Per iniziare**: se non hai le chiavi API, lasciale vuote. Le funzionalità di embedding/AI non funzioneranno, ma il resto dell'applicazione sì.

---

### Step 3: Avvia il servizio Python

In un **nuovo terminale** (lascia aperto quello dove farai `pnpm dev`):

```bash
cd services/importer

# Crea un ambiente virtuale Python (una cartella isolata per le dipendenze)
python -m venv .venv

# Attiva l'ambiente virtuale
# Windows:
.\.venv\Scripts\activate
# Mac/Linux:
source .venv/bin/activate

# Installa le dipendenze Python
pip install -r requirements.txt

# Avvia il server
uvicorn main:app --reload --port 8000
```

**Come capire se funziona:**

Dovresti vedere qualcosa come:

```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
```

**Test rapido:**

Apri il browser su `http://localhost:8000/docs` — dovresti vedere la documentazione Swagger automatica di FastAPI.

---

### Step 4: Avvia l'applicazione Nuxt

Torna al terminale principale (nella cartella radice del progetto):

```bash
pnpm dev
```

**Cosa succedeß**

1. Nuxt compila il codice TypeScript/Vue
2. Avvia un server di sviluppo con hot-reload
3. Si connette a MongoDB
4. Mostra l'URL dove vedere l'app

**Output tipico:**

```
Nuxt 4.0.0                                                    
  ➜ Local:    http://localhost:3000/
  ➜ Network:  http://192.168.1.100:3000/

[mongoose] Connected to MongoDB
```

**Apri il browser:**

Vai su `http://localhost:3000` — dovresti vedere la pagina iniziale di Taboolo!

---

## Verifica che tutto funzioni

### Checklist visiva

| Cosa | Dove verificare | Cosa devi vedere |
|------|-----------------|------------------|
| App carica | Browser `localhost:3000` | Pagina progetti (anche se vuota) |
| Connessione MongoDB | Terminale di `pnpm dev` | `[mongoose] Connected to MongoDB` |
| Servizio Python | Browser `localhost:8000/docs` | Documentazione Swagger |
| Hot reload funziona | Modifica un file Vue | La pagina si aggiorna automaticamente |

### Test pratico: il tuo primo progetto

1. Vai su `http://localhost:3000/projects`
2. Clicca "Nuovo Progetto"
3. Compila:
   - **Nome**: `Test Quickstart`
   - **Codice**: `TEST-001`
4. Salva

Se il progetto appare nella lista, **congratulazioni!** Il tuo ambiente è perfettamente funzionante.

---

## Problemi comuni e soluzioni

### "La pagina non carica / è bianca"

1. Controlla il terminale di `pnpm dev` per errori rossi
2. Apri la Console del browser (F12 → Console) per errori JavaScript
3. Verifica che MongoDB sia attivo

### "Cannot connect to MongoDB"

```bash
# Verifica che MongoDB sia in esecuzione
# Windows (PowerShell come admin):
Get-Service MongoDB

# Mac/Linux:
sudo systemctl status mongod
```

Se il servizio è fermo, avvialo:

```bash
# Windows:
Start-Service MongoDB

# Mac/Linux:
sudo systemctl start mongod
```

### "PYTHON_API_URL non raggiungibile"

Il backend Nuxt prova a contattare il servizio Python. Se non è attivo, vedrai errori tipo `ECONNREFUSED`.

**Soluzione**: assicurati che il servizio Python sia in esecuzione (Step 3).

### "Nuxt non trova moduli / errori di import"

```bash
# Rimuovi la cache e reinstalla
rm -rf node_modules .nuxt
pnpm install
pnpm dev
```

### "Errori di tipi TypeScript"

A volte i tipi auto-generati diventano inconsistenti. Prova:

```bash
pnpm nuxt prepare
```

---

## Struttura delle cartelle (anteprima)

Ora che hai l'ambiente funzionante, ecco una mappa delle cartelle principali che esplorerai nei prossimi capitoli:

```
Taboolo-nuxt/
│
├── app/                          # 🎨 FRONTEND
│   ├── pages/                    # Route automatiche
│   │   ├── projects/             # /projects, /projects/[id]
│   │   └── analytics/            # /analytics
│   ├── components/               # Componenti riutilizzabili
│   ├── composables/              # Logica condivisa (hooks)
│   ├── lib/                      # Utility frontend
│   └── types/                    # Tipi TypeScript
│
├── server/                       # 🖥️ BACKEND
│   ├── api/                      # REST endpoints
│   │   ├── projects/             # API progetti
│   │   └── analytics/            # API analytics
│   ├── models/                   # Schemi Mongoose
│   ├── services/                 # Logica applicativa
│   └── utils/                    # Utility backend
│
├── services/                     # 🐍 SERVIZI ESTERNI
│   └── importer/                 # Servizio Python
│       ├── api/                  # Endpoint FastAPI
│       ├── parsers/              # Parser SIX/Excel
│       └── logic/                # Logica elaborazione
│
└── docs/                         # 📚 DOCUMENTAZIONE
    ├── tutorial/                 # Percorso guidato
    ├── reference/                # Consultazione
    └── deep-dive/                # Approfondimenti
```

---

## Prossimi passi

Ora che hai l'ambiente funzionante, sei pronto per imparare come funziona il codice!

**Prossimo capitolo:** [02 — Fondamenti Web: JavaScript e TypeScript](02-fondamenti-web.md)

In questo capitolo imparerai:

- Le basi di JavaScript per chi viene da altri linguaggi
- Come TypeScript aggiunge i tipi
- I pattern asincroni (Promise, async/await)

---

## Risorse utili per questo capitolo

- [Documentazione pnpm](https://pnpm.io/) — Gestore pacchetti
- [Documentazione Nuxt](https://nuxt.com/docs/getting-started/installation) — Setup ufficiale
- [MongoDB Community Edition](https://www.mongodb.com/docs/manual/installation/) — Installazione database
- [Python Virtual Environments](https://docs.python.org/3/library/venv.html) — Ambienti virtuali

---

*Hai problemi non elencati qui? Consulta il [Troubleshooting](../reference/troubleshooting.md) o chiedi al team!*
