# 02 — Progetti (commesse)

Un **progetto** (o commessa) è il contenitore di tutto: baseline, offerte, analisi.

## 2.1 — Cosa contiene un progetto

Dentro un progetto troverai:

- uno o più **preventivi** importati (in genere almeno una baseline);
- le **offerte** collegate alla baseline (per impresa e round);
- viste di analisi (delta, confronti, ecc.).

## 2.2 — Campi principali (che vedrai e che conviene valorizzare)

- **Codice**: deve essere **univoco**. È il modo più rapido per cercare e identificare una commessa.
- **Nome**: descrizione leggibile.
- **Descrizione / note**: utili per contesto (ambito, cliente, vincoli).
- **Business Unit**: opzionale (dipende dall’organizzazione).
- **Stato**:
  - `setup`: progetto in preparazione
  - `in_progress`: progetto attivo
  - `closed`: progetto chiuso (storico)

## 2.3 — Elenco progetti

Nella pagina “Progetti” troverai una tabella con:

- ricerca veloce (filtra per codice/nome/descrizione);
- azioni per riga:
  - **Apri**: entra nel progetto
  - **Modifica**: cambia dati del progetto
  - **Elimina**: rimuove il progetto (azione irreversibile).

Suggerimento: se lavori su più commesse, usa una convenzione per il **codice** (es. `CLIENTE-OPERA-ANNO`).

## 2.4 — Creare un progetto

1) Clicca “Nuovo progetto”  
2) Compila i campi minimi (nome + codice)  
3) Salva

## 2.5 — Modificare un progetto

1) Apri il menu “Azioni” sulla riga progetto  
2) Seleziona “Modifica”  
3) Aggiorna e salva

## 2.6 — Eliminare un progetto (attenzione)

La cancellazione è irreversibile. In genere comporta l’eliminazione dei dati collegati (preventivi, voci, WBS, listino, offerte).

Consiglio operativo: prima di eliminare, assicurati di avere un export/backup se ti serve lo storico.

## 2.7 — Dentro un progetto: la lista preventivi

Aprendo un progetto trovi la pagina “Preventivi”.
Qui Taboolo ti mostra, per ogni preventivo:

- numero di **round** disponibili
- numero di **imprese** (complessive)
- **totale progetto** (baseline)
- (se presenti offerte) stima “migliore offerta ultimo round” e **delta vs progetto**

Da qui puoi:

- aprire un preventivo per vedere dashboard / dettaglio / confronto
- eliminare un preventivo
- andare in **Importazione** per caricare nuovi dati

