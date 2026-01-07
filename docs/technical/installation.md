# Installazione

Guida all'installazione di Taboolo in ambiente di sviluppo.

---

## Prerequisiti

| Componente | Versione | Note |
|------------|----------|------|
| Node.js | LTS (20+) | Con pnpm |
| pnpm | 8+ | Package manager |
| MongoDB | 6+ | Locale o Atlas |
| Python | 3.11+ | Per il servizio importer |
| Git | 2+ | Version control |

---

## 1. Clone Repository

```bash
git clone <repository-url>
cd Taboolo-nuxt
```

---

## 2. Frontend Nuxt

```bash
# Installa dipendenze
pnpm install

# Crea file .env (copia da esempio se presente)
cp .env.example .env
# Modifica .env con i valori corretti

# Avvia dev server
pnpm dev
```

L'app sarà disponibile su `http://localhost:3000`

---

## 3. MongoDB

### Opzione A: MongoDB Locale

```bash
# Windows (con MongoDB installato)
mongod

# Oppure Docker
docker run -d -p 27017:27017 --name mongodb mongo:6
```

### Opzione B: MongoDB Atlas

1. Crea cluster su [MongoDB Atlas](https://cloud.mongodb.com)
2. Ottieni connection string
3. Configura in `.env`

---

## 4. Servizio Python

```bash
cd services/importer

# Crea virtual environment
python -m venv .venv

# Attiva (Windows)
.\.venv\Scripts\activate

# Attiva (Linux/Mac)
source .venv/bin/activate

# Installa dipendenze
pip install -r requirements.txt

# Avvia server
python main.py
# oppure
uvicorn main:app --reload --port 8000
```

Il servizio sarà disponibile su `http://localhost:8000`

---

## 5. Configurazione .env

Crea o modifica `.env` nella root:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/taboolo

# Python Service
PYTHON_API_URL=http://localhost:8000/api/v1

# (Opzionale) Embeddings
JINA_API_KEY=your-jina-api-key

# (Opzionale) LLM per estrazione
EXTRACTION_LLM_PROVIDER=mistral
MISTRAL_API_KEY=your-mistral-key
```

---

## 6. Verifica Installazione

1. Apri `http://localhost:3000` - Dashboard Nuxt
2. Apri `http://localhost:8000/docs` - Swagger Python
3. Crea un progetto di test
4. Importa un file di esempio

---

## Comandi Utili

```bash
# Nuxt
pnpm dev          # Dev server
pnpm build        # Build produzione
pnpm lint         # Linting

# Python
python main.py    # Server con auto-reload
pytest            # Test (se configurati)
```

---

## Troubleshooting Installazione

| Problema | Soluzione |
|----------|-----------|
| `MONGODB_URI` not set | Configura .env |
| Python service non raggiungibile | Verifica porta 8000 libera |
| pnpm install fallisce | Pulisci node_modules e riprova |
