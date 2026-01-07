# Conflitti e Alert

Quando importi un'offerta, Taboolo confronta automaticamente i dati con il preventivo baseline. Se trova delle differenze, crea degli **alert** per segnalartele.

---

## Cosa sono gli Alert?

Un **alert** è un avviso che ti dice: "Ehi, ho trovato qualcosa di strano qui!" 

Per esempio:
- Un fornitore ha indicato un prezzo diverso da quello previsto
- Una voce dell'offerta non corrisponde a nessuna voce del preventivo
- La quantità offerta è diversa da quella richiesta

---

## Dove trovo gli Alert?

Vai alla pagina **Conflitti** del progetto:

```
Progetto → Conflitti
oppure
/projects/[id]/conflicts
```

---

## I 6 Tipi di Alert

### 1. 💰 Mismatch Prezzo
**Cosa significa:** Il prezzo offerto è diverso dal prezzo nel preventivo.

**Esempio:** 
- Preventivo: Pavimento gres = €45/mq
- Offerta: Pavimento gres = €52/mq
- → Alert: differenza di +€7/mq (+15.5%)

**Cosa fare:** Verifica se è un errore o se il fornitore ha prezzi diversi.

---

### 2. 📊 Mismatch Quantità
**Cosa significa:** La quantità offerta non corrisponde a quella prevista.

**Esempio:**
- Preventivo: 1.200 mq di intonaco
- Offerta: 1.350 mq di intonaco
- → Alert: +150 mq

**Cosa fare:** Controlla se il fornitore ha misurato diversamente o se c'è un errore.

---

### 3. 🔤 Mismatch Codice
**Cosa significa:** Il codice della voce non corrisponde esattamente.

**Esempio:**
- Preventivo: codice "PAV-001"
- Offerta: codice "PAV001" (senza trattino)
- → Il sistema non riesce a collegarli automaticamente

**Cosa fare:** Collega manualmente le due voci.

---

### 4. ❌ Voce Non Trovata
**Cosa significa:** Una voce dell'offerta non ha corrispondenza nel preventivo.

**Esempio:**
- L'offerta include "Ponteggio" ma nel preventivo non c'è questa voce

**Cosa fare:** 
- Se è una voce extra → marcala come "addendum"
- Se dovrebbe esserci → cerca la voce giusta e collega

---

### 5. ❓ Match Ambiguo
**Cosa significa:** Taboolo ha trovato più voci simili e non sa quale sia quella giusta.

**Esempio:**
- Offerta: "Intonaco civile"
- Preventivo contiene sia "Intonaco civile interno" che "Intonaco civile esterno"
- → Quale scegliere?

**Cosa fare:** Seleziona la voce corretta tra i suggerimenti.

---

### 6. ➕ Addendum
**Cosa significa:** Voce presente solo nell'offerta, non nel preventivo originale.

**Esempio:**
- Il fornitore propone un "Trattamento antimuffa" che non era previsto

**Cosa fare:**
- Se vuoi includerla → accetta come addendum
- Se non serve → rifiuta

---

## Gravità degli Alert

| Icona | Livello | Serve azione? |
|-------|---------|---------------|
| 🔵 Info | Bassa | Puoi ignorare |
| 🟡 Warning | Media | Meglio verificare |
| 🔴 Errore | Alta | Da risolvere |

---

## Come Risolvere un Alert

### Passo 1: Vai alla pagina Conflitti
Apri il progetto e clicca su **Conflitti** nel menu.

### Passo 2: Filtra gli alert
Usa i filtri per concentrarti su un tipo alla volta:
- Per tipo (prezzo, quantità, addendum...)
- Per gravità (errori prima, poi warning)
- Per fornitore

### Passo 3: Apri il dettaglio
Clicca su un alert per vedere:
- Cosa c'era nel preventivo
- Cosa c'è nell'offerta
- Differenza calcolata

### Passo 4: Scegli l'azione

| Azione | Quando usarla |
|--------|---------------|
| **Risolvi** | Hai collegato la voce giusta o corretto l'errore |
| **Ignora** | La differenza è accettabile, non serve azione |
| **Collega** | Per match ambigui: scegli la voce corretta |

---

## Azioni Rapide

Per velocizzare il lavoro:

- **Seleziona più alert** con le checkbox
- Clicca **"Ignora selezionati"** per chiudere tutti insieme
- Oppure **"Risolvi selezionati"** se sono già corretti

---

## 💡 Consigli Pratici

### Prima di importare
> Verifica che il file Excel abbia:
> - Codici scritti esattamente come nel preventivo
> - Colonne mappate correttamente
> - Nessuna riga vuota nel mezzo

### Durante la risoluzione
> Lavora in questo ordine:
> 1. 🔴 Prima gli **errori critici**
> 2. 🟡 Poi i **warning**
> 3. 🔵 Infine le **info** (spesso puoi ignorarle)

### Dopo la risoluzione
> Controlla che non rimangano alert aperti ("Open").
> Se hai ignorato degli alert, annotati il perché!

---

## Problemi Comuni

### "Ho tantissimi alert di codice non trovato"
**Causa probabile:** I codici nel file Excel non corrispondono a quelli del preventivo.

**Soluzione:** 
1. Controlla la mappatura colonne durante l'import
2. Verifica che i codici siano scritti allo stesso modo

---

### "Il match ambiguo propone voci sbagliate"
**Causa probabile:** Le descrizioni sono troppo generiche.

**Soluzione:**
1. Usa codici univoci se possibile
2. Altrimenti, seleziona manualmente la voce corretta

---

### "Dopo aver risolto, l'alert è ancora lì"
**Causa probabile:** Non hai salvato o c'è stato un errore.

**Soluzione:**
1. Ricarica la pagina
2. Riprova l'azione
3. Controlla la console per errori

---

## Prossimi Passi

- [Stima Prezzi](10-stima-prezzi.md) - Usa l'AI per stimare prezzi
- [FAQ](FAQ.md) - Altre domande frequenti
