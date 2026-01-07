# Documentazione Tecnica Taboolo

Questa sezione è destinata a **sviluppatori e amministratori di sistema**.

---

## Stack Tecnologico

| Componente | Tecnologia |
|------------|------------|
| **Frontend** | Nuxt 4 (Vue 3) |
| **Backend API** | Nitro (Nuxt server) |
| **Database** | MongoDB |
| **Servizio Python** | FastAPI |
| **Embeddings** | Jina AI |
| **LLM** | Configurabile (OpenAI, Anthropic, Mistral, Gemini, Ollama) |

---

## 📚 Indice

| Sezione | Descrizione |
|---------|-------------|
| [Architettura](architecture.md) | Componenti e flusso dati |
| [Installazione](installation.md) | Setup ambiente di sviluppo |
| [Configurazione](configuration.md) | Variabili ambiente e opzioni |
| [API Reference](api-reference.md) | Endpoint Nuxt e Python |
| [Modello Dati](data-model.md) | Schema MongoDB |
| [Servizio Python](python-service.md) | Parser, embeddings, analytics |
| [Struttura Frontend](frontend-structure.md) | Pagine e componenti Vue |
| [Troubleshooting](troubleshooting.md) | Risoluzione problemi |

---

## Quick Start Sviluppo

```bash
# Clone e install
git clone <repo>
cd Taboolo-nuxt
pnpm install

# Dev server
pnpm dev

# Servizio Python
cd services/importer
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

---

## Risorse

- [Manuale Utente](../user-guide/README.md) - Per utenti finali
- Repository: GitHub/GitLab interno

---

*Ultimo aggiornamento: Gennaio 2026*
