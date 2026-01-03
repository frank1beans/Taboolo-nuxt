# Jina Embeddings Integration

Questa funzionalità permette di generare vettori di embedding semantici per gli elementi dei listini prezzi importati tramite file **SIX** e **XPWE**.

## Architettura

1.  **Frontend (Nuxt)**:
    *   L'utente carica un file SIX o XPWE.
    *   Un toggle "Genera Embedding AI (Jina)" permette di attivare la funzionalità.
    *   La richiesta viene inviata al backend Python con il parametro `compute_embeddings=true`.

2.  **Backend (Python - Importer Service)**:
    *   **Logic**: Il modulo `services/importer/embedding/client.py` gestisce l'interazione con le API di Jina AI.
    *   **Endpoints**: Gli endpoint `/import-six` e `/import-xpwe` intercettano il flag.
    *   **Elaborazione**:
        *   Se attivo, per ogni `PriceListItem` viene creato un testo combinando `description` e `long_description`.
        *   I testi vengono inviati in batch alle API Jina (`jina-embeddings-v3`).
        *   I vettori risultanti (liste di float) vengono assegnati al campo `embedding` del modello `PriceListItem`.
    *   **Chiave API**: Richiede la variabile d'ambiente `JINA_API_KEY`.

3.  **Persistenza (Nuxt Server)**:
    *   Il servizio `ImportPersistenceService.ts` riceve il payload JSON dal Python.
    *   Durante il salvataggio o aggiornamento dei `PriceListItem` su MongoDB, il campo `embedding` viene persistito.

## Configurazione

Assicurarsi che nel file `.env` sia presente:

```env
JINA_API_KEY=jina_...
```

## Struttura Dati

### MongoDB Schema (`PriceListItem`)

```typescript
{
  // ... altri campi
  embedding: [0.123, -0.456, ...], // Array di numeri (vettore)
  // ...
}
```

### Python Model

```python
class PriceListItem(BaseModel):
    # ...
    embedding: Optional[List[float]] = None
```

## Note Sviluppo

- La generazione è opzionale perché richiede tempo e consuma crediti API.
- In caso di errore API (es. timeout o chiave mancante), l'importazione prosegue senza embedding (warning nei log).

