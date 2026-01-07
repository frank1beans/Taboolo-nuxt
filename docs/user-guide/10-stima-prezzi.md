# Stima Prezzi (Price Estimator)

Non sai quanto costa una lavorazione? Chiedi a Taboolo! 

Lo **Stimatore Prezzi** analizza i tuoi progetti passati e ti dà un range di prezzo.

---

## Come Funziona

1. Tu scrivi una descrizione ("Pavimento gres 60x60")
2. Taboolo cerca voci simili nei progetti precedenti
3. Ti mostra un range di prezzo (min - max) e una stima consigliata

---

## Come Usarlo

### Passo 1: Apri lo Stimatore
- Dalla sidebar: **Stima Prezzi**
- Oppure vai a `/price-estimator`

### Passo 2: Scrivi la Descrizione

Più dettagli = stima migliore!

❌ Troppo generico:
```
Pavimento
```

✅ Meglio:
```
Fornitura e posa pavimento in gres porcellanato 60x60
```

✅ Ancora meglio:
```
Fornitura e posa in opera di pavimento in gres porcellanato 
formato 60x60 cm, spessore 9mm, posato a colla su massetto
```

### Passo 3: Aggiungi Dettagli (Opzionale)

| Campo | Esempio |
|-------|---------|
| **Unità** | mq, ml, kg, cad |
| **Quantità** | 500 |

### Passo 4: Clicca "Stima"

Attendi qualche secondo...

---

## Leggere i Risultati

### Il Range di Prezzo

| Valore | Cosa indica |
|--------|-------------|
| **Minimo** | Prezzo più basso trovato |
| **Massimo** | Prezzo più alto trovato |
| **Media** | Media dei prezzi |
| **Stima consigliata** | Il valore più probabile |

### La Confidenza

Indica quanto Taboolo è sicuro:

| Indicatore | Significato |
|------------|-------------|
| 🟢 **Alta** | Molte voci simili, prezzi coerenti |
| 🟡 **Media** | Poche voci o prezzi variabili |
| 🔴 **Bassa** | Pochissimi dati, stima incerta |

### Le Voci di Riferimento

Sotto il range, vedi le voci usate per la stima:
- Descrizione originale
- Da quale progetto
- Prezzo nel listino
- Quanto è simile alla tua ricerca (%)

---

## 💡 Suggerimenti

> **Descrizioni tecniche** funzionano meglio. Usa i termini del settore.

> **Controlla le voci di riferimento.** Se non sono pertinenti, la stima potrebbe essere imprecisa.

> **Più progetti importati** = stime migliori. Il sistema impara dai tuoi dati.

---

## Quando NON Usarlo

Lo stimatore è **indicativo**, non sostituisce:
- Un preventivo dettagliato
- Il listino prezzi ufficiale
- La valutazione di un tecnico

**Usalo per:**
- Avere un'idea di massima
- Verificare se un prezzo è ragionevole
- Benchmark veloci

---

## Problemi Comuni

### "Nessun risultato trovato"
- La descrizione è troppo generica
- Prova ad aggiungere più dettagli
- Oppure mancano progetti con embeddings

### "Risultati non pertinenti"
- Riformula la descrizione
- Usa termini più specifici

### "Range troppo ampio"
- C'è molta variabilità nei dati
- Il prezzo può davvero variare molto per quella lavorazione

---

## Prerequisiti Tecnici

Per usare lo stimatore:
- ✅ Almeno un progetto con embeddings calcolati
- ✅ Servizio Python attivo
- ⚡ (Opzionale) LLM configurato per stime avanzate

---

## Prossimo Passo

Hai altre domande?
👉 [FAQ](FAQ.md)
