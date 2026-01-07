# Troubleshooting

Problemi comuni e soluzioni.

---

## Import Computo

### Import SIX/XPWE fallisce

**Cause:**
- Servizio Python non attivo
- File troppo grande
- File corrotto

**Soluzioni:**
1. Verifica servizio Python su porta 8000
2. Aumenta `PYTHON_PROXY_MAX_UPLOAD_MB` e `TABOO_MAX_UPLOAD_SIZE_MB`
3. Verifica integrità del file

### Timeout durante import

Aumenta `PYTHON_PROXY_TIMEOUT_MS` (default 600000 = 10 min).

---

## Import Offerte

### "Preventivo baseline richiesto"

Importa prima il computo, poi le offerte.

### Match non funziona

- Verifica mappatura colonne
- Per LX: codici coerenti con listino
- Per MX: progressivo corretto

---

## Analytics

### Mappa vuota

Gli embeddings non sono stati calcolati.

**Soluzione:** Reimporta con checkbox "Embeddings" attiva.

### Errore calcolo mappa

Verifica `JINA_API_KEY` nel servizio Python.

---

## Database

### Connessione MongoDB fallisce

1. Verifica `MONGODB_URI`
2. Verifica che MongoDB sia attivo
3. Controlla firewall/network

---

## Servizio Python

### "Python service not reachable"

1. Avvia il servizio: `python main.py`
2. Verifica porta 8000 libera
3. Controlla `PYTHON_API_URL`

### Errori logging

Imposta `TABOO_LOG_LEVEL=DEBUG` per diagnostica.

---

## Prestazioni

### App lenta

1. Riduci dimensione file importati
2. Limita query con filtri
3. Aumenta risorse MongoDB

### Mappa lenta

Troppi punti. Usa filtri per ridurre dataset.

---

## Log e Debug

### Nuxt

Console browser + log server Nitro.

### Python

Log su stdout. Livello configurabile via `TABOO_LOG_LEVEL`.

### MongoDB

Usa MongoDB Compass per ispezionare dati.
