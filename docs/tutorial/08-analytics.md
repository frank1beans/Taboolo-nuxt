# 08 — Analytics: UMAP, clustering e analisi prezzi

Questo capitolo introduce le funzionalità avanzate di analisi.

**Tempo stimato:** 20-30 minuti

---

## Panoramica Analytics

Taboolo include strumenti avanzati per analizzare i dati:

| Funzionalità | Descrizione |
|--------------|-------------|
| **Semantic Map** | Visualizzazione UMAP degli item in 2D/3D |
| **Price Analysis** | Stima prezzo equo e detection outlier |
| **Gravitational Clustering** | Raggruppamento per affinità semantica |

---

## La mappa semantica (UMAP)

### Come funziona

1. Ogni voce del listino ha un **embedding** (vettore numerico)
2. L'algoritmo **UMAP** riduce le dimensioni a 2D/3D
3. Voci simili appaiono vicine sulla mappa

### Come usarla

1. Vai su **Analytics** nel menu
2. Seleziona i progetti da includere
3. Clicca **Compute UMAP** per generare la mappa
4. Esplora:
   - **Colora per** WBS, categoria, prezzo
   - **Seleziona** punti con lasso/box
   - **Export** selezione in CSV

---

## Analisi prezzi

### Stima prezzo equo

Per ogni voce, Taboolo calcola un **prezzo equo** basato su:

- Voci simili nello stesso WBS6
- Mediana pesata per similarità
- Esclusione outlier (MAD)

### Rilevamento outlier

Un prezzo è marcato come **outlier** se:

- Devia significativamente dalla mediana robusta
- Z-score MAD > soglia configurabile

---

## Approfondimenti

Per dettagli tecnici, vedi la sezione **Deep Dive**:

- [Gravitational Clustering](../deep-dive/gravitational-clustering.md)
- [Price Analysis](../deep-dive/price-analysis.md)
- [Semantic Map](../deep-dive/semantic-map.md)

---

## Fine del tutorial! 🎉

Hai completato il percorso tutorial. Ora conosci:

- ✅ Come impostare l'ambiente
- ✅ I fondamenti di JavaScript/TypeScript e Vue/Nuxt
- ✅ L'architettura di Taboolo
- ✅ Come importare computi e offerte
- ✅ Come navigare dashboard e griglie
- ✅ Le funzionalità di analytics

**Prossimi passi:**

- Consulta il [Reference](../reference/) per lookup rapidi
- Esplora i [Deep Dive](../deep-dive/) per capire i meccanismi interni
- Sperimenta con dati reali!
