# Listino e Catalogo

Questa sezione spiega come consultare i listini prezzi del progetto e il catalogo globale.

---

## Listino di Progetto

Pagina: `/projects/:id/pricelist`

### Cos'è il Listino

Il **listino** (PriceList) contiene le voci prezzate del preventivo baseline:
- Codice e descrizione di ogni voce
- Unità di misura
- Prezzo unitario di riferimento
- Categoria WBS

### Come Accedere

1. Apri il progetto
2. Nella sidebar destra o nel menu, clicca **"Listino"**
3. Oppure naviga a `/projects/:id/pricelist`

---

## Visualizzazione Listino

### Tabella Voci

| Colonna | Descrizione |
|---------|-------------|
| **Codice** | Identificativo univoco |
| **Descrizione** | Testo descrittivo breve |
| **Desc. Estesa** | Descrizione completa |
| **Unità** | Unità di misura (mq, ml, kg...) |
| **Prezzo** | Prezzo unitario |
| **WBS** | Categoria di appartenenza |

### Filtri

- **Ricerca testo**: cerca per codice o descrizione
- **Filtro WBS**: mostra solo voci di una categoria
- **Ordinamento**: per codice, prezzo, descrizione

---

## Dettaglio Voce

Clicca su una voce per vedere:
- Descrizione completa (long description)
- Proprietà estratte (se disponibili)
- Progetti in cui appare (nel catalogo globale)
- Link alle offerte correlate

---

## Catalogo Globale

Pagina: `/catalogs`

### Cos'è il Catalogo

Il **catalogo globale** unifica tutte le voci di tutti i progetti:
- Vista trasversale dei prezzi
- Confronto tra progetti diversi
- Ricerca semantica avanzata

### Come Accedere

1. Dalla sidebar principale, clicca **"Catalogo"**
2. Oppure naviga a `/catalogs`

---

## Funzionalità Catalogo

### Ricerca

- **Testuale**: cerca per codice o testo
- **Semantica**: cerca per significato (richiede embeddings)

### Filtri

| Filtro | Funzione |
|--------|----------|
| **Progetto** | Mostra solo voci di un progetto |
| **WBS** | Filtra per categoria lavorazioni |
| **Range prezzo** | Filtra per fascia di prezzo |

### Visualizzazione

- **Tabella**: lista classica paginata
- **Dettaglio**: pannello laterale con informazioni complete

---

## Ricerca Semantica

La ricerca semantica trova voci **simili per significato**, non solo per parole chiave.

### Esempio

Cercando `"pavimento in gres porcellanato"` trovi anche:
- "Rivestimento in piastrelle ceramiche"
- "Fornitura e posa gres effetto legno"
- Voci con descrizioni simili ma parole diverse

### Prerequisiti

- Gli embeddings devono essere stati calcolati durante l'import
- Servizio Python attivo con chiave Jina

### Come Usarla

1. Digita una descrizione nella barra di ricerca
2. Clicca sull'icona **ricerca semantica** (o premi invio)
3. I risultati sono ordinati per rilevanza

---

## Azioni Disponibili

### Esportare il Listino

1. Clicca **"Esporta"** nella toolbar
2. Scegli il formato (Excel, CSV)
3. Seleziona le voci da esportare (tutte o solo filtrate)

### Confrontare Prezzi

Nel catalogo globale puoi vedere la stessa voce in progetti diversi:
- Prezzi nel tempo
- Variazioni tra committenti
- Trend di mercato

---

## Uso Tipico

### Verifica Coerenza

Usa il listino per verificare che i prezzi importati siano coerenti:
- Nessuna voce con prezzo zero
- Unità di misura corrette
- Codici univoci

### Ricerca Benchmark

Usa il catalogo globale per:
- Trovare prezzi di riferimento per nuove voci
- Confrontare offerte con progetti passati
- Identificare outlier

---

## Suggerimenti

> 💡 **Tip**: Attiva gli embeddings durante l'import per abilitare la ricerca semantica.

> 💡 **Tip**: Usa il filtro WBS per navigare grandi listini per categoria.

> 💡 **Tip**: Esporta il listino in Excel per analisi esterne.

---

**Prossimo**: [Analytics e Mappe](08-analytics-mappe.md)
