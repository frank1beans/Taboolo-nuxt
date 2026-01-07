# Confronto Offerte

Dopo aver importato il preventivo e le offerte, è il momento di confrontare! Taboolo ti mostra le differenze in modo chiaro.

---

## Dove Trovo il Confronto?

1. Apri il progetto
2. Clicca sul preventivo
3. Sei nella pagina di confronto!

Oppure: `/projects/[id]/estimate/[estimateId]`

---

## Cosa Vedo nella Tabella

| Colonna | Cosa mostra |
|---------|-------------|
| **Voce** | Codice e descrizione |
| **Baseline** | Il prezzo/quantità originale |
| **Offerta 1, 2...** | I valori delle offerte |
| **Delta** | La differenza (€) |
| **%** | La differenza in percentuale |

### Colori

| Colore | Significato |
|--------|-------------|
| 🟢 **Verde** | Offerta migliore (costa meno) |
| 🔴 **Rosso** | Offerta peggiore (costa di più) |
| 🟡 **Giallo** | Attenzione (problema o ambiguità) |
| ⚪ **Grigio** | Voce non presente nell'offerta |

---

## Come Leggere il Delta

Il **delta** è la differenza tra offerta e baseline.

**Esempio:**
```
Baseline: €45/mq
Offerta:  €52/mq
─────────────────
Delta:    +€7/mq (+15.5%)
```

- **Delta positivo (+):** l'offerta costa **di più**
- **Delta negativo (-):** l'offerta costa **di meno**

---

## Filtrare i Dati

### Per Offerta
- Scegli quale round (1°, 2°, 3° giro)
- Scegli quale impresa

### Per Voce
- **Cerca:** digita codice o descrizione
- **WBS:** filtra per categoria
- **Stato:** solo voci con alert, solo addendum...

---

## Le Diverse Viste

### Confronto Principale
`/projects/[id]/estimate/[estimateId]`

Vista d'insieme: baseline + tutte le offerte.

### Dettaglio Computo
`/projects/[id]/estimate/[estimateId]/detail`

Solo le voci del baseline, senza offerte.

### Dettaglio Offerta
`/projects/[id]/estimate/[estimateId]/offer`

Le voci di una singola offerta nel dettaglio.

### Confronto Aggregato
`/projects/[id]/estimate/[estimateId]/comparison`

Analisi aggregata: medie, min/max, delta per offerta.

---

## Trovare l'Offerta Migliore

### Per voce singola
La cella **verde** indica il prezzo più basso.

### Per offerta totale
Nella sidebar vedi:
- Importo totale per ogni offerta
- Delta complessivo rispetto al baseline
- Ranking (chi ha offerto meno)

---

## Azioni Utili

### Vedere il Dettaglio
- **Doppio click** su una riga → apre il pannello dettaglio
- Vedi tutte le proprietà della voce

### Esportare
- Clicca **Esporta** nella toolbar
- Scegli formato: Excel o CSV
- Scarica per analisi esterne

### Andare ai Conflitti
- Clicca su una voce con alert (icona ⚠️)
- Oppure vai direttamente a **Conflitti**

---

## 💡 Suggerimenti

> **Ordina per delta %** per trovare le voci con maggiore scostamento.

> **Filtra per WBS** per analizzare categoria per categoria.

> **Espandi la sidebar destra** per vedere i dettagli senza cambiare pagina.

> **Controlla i totali** nella sidebar per un quadro d'insieme.

---

## Prossimo Passo

Se hai trovato delle differenze:
👉 [Conflitti e Alert](09-conflitti-alert.md) - Gestisci e risolvi le discrepanze

Per vedere i listini:
👉 [Listino e Catalogo](07-listino-catalogo.md)
