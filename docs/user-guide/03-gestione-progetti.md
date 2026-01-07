# Gestione Progetti

Questa sezione spiega come gestire i progetti in Taboolo: creazione, modifica, dashboard e ciclo di vita.

---

## Lista Progetti

Accedi dalla sidebar: **Progetti**

La lista mostra tutti i progetti con:
- Nome e codice
- Stato (Setup, In Progress, Closed)
- Data di creazione/modifica
- Numero di preventivi e offerte

### Filtri e Ricerca

- **Ricerca**: cerca per nome o codice
- **Filtri**: filtra per stato, business unit, data
- **Ordinamento**: ordina per nome, data, stato

---

## Creare un Progetto

1. Clicca **"+ Nuovo Progetto"**
2. Compila i campi:

| Campo | Obbligatorio | Descrizione |
|-------|--------------|-------------|
| Nome | ✅ | Nome descrittivo |
| Codice | ✅ | Codice univoco |
| Descrizione | ❌ | Note aggiuntive |
| Business Unit | ❌ | Divisione aziendale |
| Note | ❌ | Commenti interni |

3. Clicca **"Salva"**

---

## Dashboard di Progetto

Dopo aver aperto un progetto, vedrai la **dashboard di progetto** con:

### Riepilogo Preventivi
- Lista dei preventivi baseline importati
- Importo totale per preventivo
- Numero di voci

### Offerte per Round
- Conteggio offerte per giro di gara
- Imprese che hanno partecipato
- Stato delle offerte (draft, submitted, accepted)

### Azioni Rapide
- **Importa computo**: vai alla pagina import
- **Importa offerte**: aggiungi nuove offerte
- **Visualizza conflitti**: apri la pagina conflitti
- **Analytics**: mappa semantica del progetto

---

## Modificare un Progetto

1. Apri il progetto dalla lista
2. Clicca **"Modifica"** nella topbar o sidebar
3. Aggiorna i campi desiderati
4. Clicca **"Salva"**

### Campi Modificabili
- Nome, Descrizione, Note
- Business Unit, Revisione
- Stato del progetto

---

## Stati del Progetto

| Stato | Significato | Azioni Disponibili |
|-------|-------------|-------------------|
| **Setup** | Progetto creato, in configurazione | Import, modifica |
| **In Progress** | Lavori in corso, offerte attive | Import, confronto, analytics |
| **Closed** | Progetto completato o archiviato | Solo visualizzazione |

### Cambiare Stato

Lo stato può essere cambiato:
- Automaticamente (dopo import baseline)
- Manualmente (dalla modifica del progetto)

---

## Eliminare un Progetto

> ⚠️ **Attenzione**: L'eliminazione è irreversibile e rimuove tutti i dati associati.

1. Apri il progetto
2. Clicca **"Elimina"** (di solito nel menu azioni)
3. Conferma l'eliminazione

### Cosa viene eliminato:
- Preventivi e voci
- Offerte e item offerta
- Listini e WBS
- Alert e conflitti

---

## Navigare tra le Sezioni del Progetto

Dalla dashboard di progetto puoi accedere a:

| Sezione | Percorso | Descrizione |
|---------|----------|-------------|
| Import | `/projects/:id/import` | Importa computi e offerte |
| Preventivo | `/projects/:id/estimate/:estimateId` | Confronto offerte |
| Listino | `/projects/:id/pricelist` | Voci prezzate |
| Conflitti | `/projects/:id/conflicts` | Alert e mismatch |
| Analytics | `/projects/:id/analytics` | Mappa semantica |

---

## Suggerimenti

> 💡 **Tip**: Usa codici progetto significativi (es. "2026-SCUOLA-ROMA-001") per trovarli facilmente.

> 💡 **Tip**: Aggiungi note dettagliate per documentare decisioni e modifiche.

> 💡 **Tip**: Chiudi i progetti completati per mantenere pulita la lista attiva.

---

**Prossimo**: [Import Computo](04-import-computo.md)
