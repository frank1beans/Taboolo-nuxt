# Analytics e Mappe Semantiche

La **mappa semantica** è una visualizzazione interattiva delle voci dei tuoi listini. Voci simili appaiono vicine, voci diverse appaiono lontane.

---

## A Cosa Serve?

- **Esplorare** i tuoi dati in modo visivo
- **Trovare** voci simili velocemente
- **Identificare** outlier e anomalie di prezzo
- **Confrontare** progetti diversi

---

## Come Accedere

### Analytics Globale
Vedi tutti i progetti insieme:
- Sidebar → **Analytics**
- Oppure `/analytics`

### Analytics di Progetto
Vedi solo un progetto:
- Apri il progetto → **Analytics**
- Oppure `/projects/[id]/analytics`

---

## La Mappa

### Come Leggerla

Ogni **punto** è una voce del listino.

- **Voci simili** = punti vicini
- **Voci diverse** = punti lontani
- **Cluster** = gruppi di voci dello stesso tipo

### Navigazione

| Azione | Mouse | Touch |
|--------|-------|-------|
| **Ruota** | Trascina | Un dito |
| **Zoom** | Scroll | Pizzica |
| **Sposta** | Shift + Trascina | Due dita |

### Clicca su un Punto
Vedi i dettagli:
- Descrizione
- Prezzo
- Progetto di appartenenza
- Link al listino

---

## Colorare la Mappa

Cambia i colori per esplorare dimensioni diverse:

| Colorazione | Cosa vedi |
|-------------|-----------|
| **Progetto** | Ogni progetto ha un colore |
| **Cluster** | Gruppi semantici automatici |
| **WBS** | Categorie di lavorazione |
| **Prezzo** | Gradiente blu→rosso (basso→alto) |

---

## Filtri

### Filtra per Progetto
Mostra solo voci di uno o più progetti.

### Filtra per WBS
Concentrati su una categoria (es. solo "Impianti").

### Filtra per Cluster
Guarda un gruppo semantico specifico.

### Filtra per Prezzo
Imposta un range min-max.

---

## Ricerca Semantica 🔍

La funzione più potente!

**Come funziona:**
1. Scrivi una descrizione nella barra di ricerca
2. Taboolo trova voci **simili per significato**
3. La mappa zooma sui risultati

**Esempio:**
Cerchi "pavimento in ceramica" e trova anche:
- "Rivestimento gres porcellanato"
- "Piastrelle in monocottura"
- "Fornitura pavimenti ceramici"

---

## Casi d'Uso

### Trovare Prezzi di Riferimento
1. Cerca una descrizione
2. Vedi i punti simili
3. Confronta i prezzi nei dettagli

### Verificare Coerenza
1. Colora per prezzo
2. Cerca zone rosse anomale (prezzi alti)
3. Clicca per verificare se sono corretti

### Confrontare Progetti
1. Colora per progetto
2. Vedi quanto si sovrappongono
3. Punti isolati = voci uniche di un progetto

---

## Ricalcolare la Mappa

Se i dati cambiano (nuovi import), puoi ricalcolare:

1. Clicca **"Ricalcola mappa"** nella toolbar
2. Attendi (può richiedere tempo per molti dati)
3. La mappa si aggiorna

---

## 💡 Suggerimenti

> **Mappa vuota?** Gli embeddings non sono stati calcolati. Reimporta i computi con embeddings attivi.

> **Troppi punti?** Usa i filtri per restringere il set di dati.

> **Zooma sui cluster** per vedere i dettagli delle voci raggruppate.

---

## Prerequisiti

Per usare la mappa:
- ✅ Computi importati con **embeddings** attivi
- ✅ Servizio Python attivo
- ✅ Chiave Jina configurata (server)

---

## Prossimo Passo

👉 [Conflitti e Alert](09-conflitti-alert.md) - Gestisci le discrepanze
👉 [Stima Prezzi](10-stima-prezzi.md) - Stima prezzi con AI
