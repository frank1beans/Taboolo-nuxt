# Configurazione

Variabili di configurazione per Nuxt e il servizio Python.

---

## Nuxt (nuxt.config.ts)

### Variabili Runtime

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `MONGODB_URI` | - | Connection string MongoDB |
| `PYTHON_API_URL` | `http://localhost:8000/api/v1` | URL servizio Python |
| `PYTHON_PROXY_MAX_UPLOAD_MB` | `100` | Max upload MB |
| `PYTHON_PROXY_TIMEOUT_MS` | `600000` | Timeout proxy (10 min) |

### Esempio .env

```env
MONGODB_URI=mongodb://localhost:27017/taboolo
PYTHON_API_URL=http://localhost:8000/api/v1
PYTHON_PROXY_MAX_UPLOAD_MB=200
PYTHON_PROXY_TIMEOUT_MS=900000
```

---

## Python (core/config.py)

### Variabili con prefisso TABOO_

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `TABOO_APP_NAME` | `Taboolo Importer` | Nome app |
| `TABOO_API_V1_PREFIX` | `/api/v1` | Prefisso API |
| `TABOO_DEBUG` | `false` | Modalità debug |
| `TABOO_MAX_UPLOAD_SIZE_MB` | `100` | Max upload |
| `TABOO_CORS_ORIGINS` | `*` | Origini CORS |
| `TABOO_LOG_LEVEL` | `INFO` | Livello log |

### Database

| Variabile | Descrizione |
|-----------|-------------|
| `MONGODB_URI` | Connection string |
| `MONGODB_DBNAME` | Nome database |

### Embeddings (Jina)

| Variabile | Descrizione |
|-----------|-------------|
| `JINA_API_KEY` | API key Jina AI |

> ⚠️ Senza `JINA_API_KEY` le mappe semantiche non funzionano.

### LLM (Estrazione Proprietà)

| Variabile | Descrizione |
|-----------|-------------|
| `EXTRACTION_LLM_PROVIDER` | Provider: `mistral`, `openai`, `anthropic`, `gemini`, `ollama` |
| `EXTRACTION_LLM_MODEL` | Modello specifico |
| `OPENAI_API_KEY` | Chiave OpenAI |
| `ANTHROPIC_API_KEY` | Chiave Anthropic |
| `MISTRAL_API_KEY` | Chiave Mistral |
| `GEMINI_API_KEY` | Chiave Gemini |
| `OLLAMA_BASE_URL` | URL Ollama locale |

---

## Esempio Completo .env Python

```env
# App
TABOO_DEBUG=true
TABOO_LOG_LEVEL=DEBUG
TABOO_MAX_UPLOAD_SIZE_MB=200

# Database
MONGODB_URI=mongodb://localhost:27017
MONGODB_DBNAME=taboolo

# Embeddings
JINA_API_KEY=jina_xxxxxxxxxxxxx

# LLM
EXTRACTION_LLM_PROVIDER=mistral
MISTRAL_API_KEY=xxxxxxxxxxxxx
```

---

## Note

- Configura solo le chiavi dei provider che intendi usare
- Le variabili sono lette all'avvio del servizio
- Per modifiche, riavvia il servizio
