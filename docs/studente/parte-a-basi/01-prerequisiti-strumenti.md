# 01 - Prerequisiti e strumenti (da zero)

Obiettivo di questo capitolo: portarti da "ho appena clonato la repo" a "posso avviare tutto in locale, vedere la UI, chiamare le API e capire gli errori basilari".

Non serve diventare esperto di DevOps: serve un setup minimo, ripetibile e senza misteri.

## 01.1 - Cosa sono Git, Node e pnpm (in 2 minuti)

- Git: versionamento. La repo è una cartella con una storia (branch, commit, diff).
- Node.js: runtime per eseguire JavaScript/TypeScript e tutti i tool di build (Nuxt, Vite, ESLint).
- pnpm: gestore pacchetti (simile a npm/yarn) usato in questa repo.

Il "minimo vitale" per lavorare qui:

- installare dipendenze (`pnpm install`)
- avviare in dev (`pnpm dev`)
- leggere errori di build/lint e capire dove intervenire

## 01.2 - Checklist: cosa deve funzionare sul tuo PC

Prima di addentrarti nel codice, verifica queste 6 cose:

1) `node --version` (idealmente una LTS recente)
2) `pnpm --version`
3) `git --version`
4) `pnpm install` finisce senza errori
5) `pnpm dev` parte e apre `http://localhost:3000`
6) Mongo e servizio Python importer sono raggiungibili (vedi sotto)

## 01.3 - Installazione dipendenze Node

Da root repo:

```bash
pnpm install
```

Se fallisce, le cause comuni sono:

- versione Node troppo vecchia
- installazione pacchetti corrotta (cache) o `node_modules` incoerente
- permessi su Windows (path troppo lunghi / antivirus che blocca file)

Rimedio pragmatico (quando non sai dove sbattere la testa):

1) chiudi IDE
2) cancella `node_modules/`
3) rilancia `pnpm install`

### 01.3.1 - Cosa succede quando fai `pnpm install`

- `pnpm` legge `package.json` (dipendenze dichiarate)
- usa `pnpm-lock.yaml` per inchiodare versioni esatte
- crea `node_modules/` con hardlink/symlink (più veloce e deduplicato)
- esegue script `postinstall` (qui: `nuxt prepare`)

Regola pratica: se tu e un collega avete lo stesso `pnpm-lock.yaml`, dovreste ottenere un ambiente molto simile.

## 01.4 - Avvio Nuxt in sviluppo

```bash
pnpm dev
```

Poi apri:

- `http://localhost:3000`

### 01.4.1 - Cosa osservare quando lanci `pnpm dev`

Quando l'app parte, controlla 3 cose:

1) errori TypeScript/build nel terminale
2) log di connessione MongoDB (file: `server/plugins/mongoose.ts`)
3) eventuali errori di import/alias (`#models`, `#utils`, `#services`)

Suggerimento pratico: se "non carica" qualcosa, guarda sempre in quest'ordine:

1) terminale di `pnpm dev` (server)
2) Console del browser (client)
3) tab Network (richieste fallite)

## 01.5 - Servizi esterni: MongoDB e Python importer

Taboolo non è una "single page statica". Anche in locale, ti servono almeno:

- MongoDB (persistenza)
- un servizio Python (parsing/import di file SIX e di ritorni Excel)

### 01.5.1 - MongoDB: come farlo partire (locale)

Hai due opzioni tipiche:

- Mongo installato sul PC (servizio `mongod`)
- Mongo via container (Docker)

La repo si connette a Mongo tramite:

- variabile `MONGODB_URI` (consigliata)
- fallback in `server/plugins/mongoose.ts` (default: `mongodb://localhost:27017/taboolo`)

### 01.5.2 - Python importer: dove sta e come avviarlo

In questa repo il servizio è in `services/importer/`.

Esempio (sviluppo):

```bash
cd services/importer
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Il backend Nuxt (Nitro) parla con Python tramite `PYTHON_API_URL` (vedi capitolo 06).

Nota importante: Nitro non invia "file raw" con logica custom; fa da proxy multipart (file + form fields) verso Python.

## 01.6 - Editor e strumenti consigliati (per studiare bene)

Editor:

- VS Code o WebStorm (suggeriti perché hanno ottimi strumenti TS/Vue)

Estensioni utili (VS Code):

- Vue (Volar)
- ESLint
- Tailwind CSS IntelliSense (se lavori sui CSS)

Strumenti che userai spesso:

- `rg` (ripgrep) per cercare nel codice
- DevTools del browser (Network + Console)
- `pnpm lint` per una baseline di qualità

## 01.7 - Comandi base che devi saper fare (senza paura)

- install: `pnpm install`
- dev: `pnpm dev`
- build: `pnpm build`
- preview: `pnpm preview`
- lint: `pnpm lint`

Non serve memorizzarli: basta sapere che esistono e cosa significano.

## 01.8 - Mini-esercizi (verifica che sei pronto)

1) Apri `package.json` e trova:
   - lo script `dev`
   - lo script `lint`
2) Avvia `pnpm dev` e individua nel terminale:
   - la porta (default 3000)
   - log Mongo ("Connected to MongoDB") o errori di connessione
3) Apri `docs/studente/appendici/riferimento/pagine-routes.md` e visita:
   - `/projects`
   - `/projects/<id>`

Se hai completato questi passi, sei pronto per i capitoli di programmazione (02-04) e per il tour della repo (05).
