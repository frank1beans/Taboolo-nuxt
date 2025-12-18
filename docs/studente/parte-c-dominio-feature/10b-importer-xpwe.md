# 10b - Import XPWE (PriMus)

Obiettivo: capire come funzionano il parsing e l'importazione dei file XPWE/PriMus.

Il flusso ricalca quello del SIX (vedi cap 10), ma con peculiarità specifiche del formato PriMus e della gestione WBS.

## 10b.1 - Architettura XPWE

Anche per XPWE utilizziamo il servizio Python esterno per il parsing XML, orchestrato da Nitro.

1.  **Frontend (`app/pages/projects/[id]/import/index.vue`)**:
    - Gestisce l'upload del file `.xpwe` o `.xml`.
    - Offre una **Preview** per selezionare il preventivo (se multipli).
    - Offre una **Mappatura WBS** (cruciale per XPWE).

2.  **Backend Nitro (`server/api/projects/[id]/import-xpwe.post.ts`)**:
    - Proxy verso Python.
    - Gestisce la persistenza tramite `LoaderService`.

3.  **Servizio Python (`services/importer/parsers/xpwe/parser.py`)**:
    - Parsing stream XML (`ElementTree`).
    - Normalizzazione dati.
    - Logica di "back-propagation" delle categorie.

## 10b.2 - Il Problema della WBS in XPWE

A differenza del SIX che ha una struttura WBS rigida e ben definita, XPWE è molto flessibile (e caotico):
- Categorie, SuperCategorie, Capitoli vivono in alberi separati.
- Gli ID spesso collidono (es. ID="1" esiste sia per Categoria che per Capitolo).
- Le voci di listino (`EPItem`) spesso **non hanno** link diretti alla WBS.

### Soluzione 1: Namespacing degli ID
Per evitare collisioni, il parser python rinomina internamente gli ID:
- Categoria ID 1 -> `categoria_1`
- Capitolo ID 1 -> `capitolo_1`
Questo crea un albero WBS piatto ma univoco.

### Soluzione 2: Back-Propagation (Propagazione Inversa)
Molto spesso in PriMus, la categoria è assegnata alla **Misurazione** (`VCItem`), non all'articolo di listino.
Se importassimo 'as-is', il listino risulterebbe privo di categorie.

Il parser implementa una logica intelligente (`_post_linking`):
1.  Scansiona tutte le misurazioni.
2.  Se una misurazione usa l'articolo `X` ed è nella categoria `Y`...
3.  ...assegna automaticamente la categoria `Y` all'articolo `X`.

In questo modo, il listino importato risulta correttamente categorizzato.

## 10b.3 - Mappatura Utente (UI -> Backend)

Poiché XPWE usa nomi liberi (es. "SuperCategorie", "MacroLotti"), Taboolo deve sapere come mapparli sui suoi livelli canonici (01-07).

**Flusso:**
1.  **Preview**: Il backend Python restituisce la lista dei `type` trovati nel file (es. `supercategoria`, `categoria`).
2.  **UI Import**: L'utente mappa questi tipi ai livelli Taboolo (es. `SuperCategorie` -> `Livello 1`, `Categorie` -> `Livello 6`).
3.  **Import**: Il frontend invia la mappa JSON al backend.
4.  **Backend Logic**:
    - Riceve la mappa (case-insensitive e robusta).
    - Assegna ai nodi WBS il `level` corretto (1...7).
    - I nodi non mappati vengono impostati a `level=0` (nascosti).

## 10b.4 - Sidebar WBS e "Nodi Orfani"

Una volta importati i dati, sorge un problema di visualizzazione nella Sidebar se la gerarchia non è completa.
Esempio tipico: Il file ha Categorie (Livello 2/6) ma non SuperCategorie (Livello 1).

Se visualizzassimo l'albero così com'è, le Categorie apparirebbero alla radice, mescolandosi (erroneamente) con i Lotti/Edifici.

**Soluzione "Nessuno":**
Il frontend (`useWbsTree.ts`) implementa una logica di **Gap Filling**:
- Se una voce **non ha** un genitore di Livello 1...
- ...ma appartiene a un livello inferiore (es. Livello 2, 3... 7)...
- Viene iniettato automaticamente un nodo genitore sintetico: **(Nessuno)**.

Risultato visuale pulito:
```
- (Nessuno)
  - Scavi (Categoria)
  - Murature (Categoria)
```

## 10b.5 - Ciclo di vita della Persistenza

La persistenza XPWE usa `LoaderService.transform` (lato Python) ma segue lo stesso destino del SIX una volta arrivata a Nitro: `persistProjectEstimate` che salva su MongoDB.

I dati salvati sono **coerenti** tra SIX e XPWE:
- Livelli WBS sono interi (`1`, `2`...).
- Codici e Descrizioni sono strippati da spazi.

## 10b.6 - Debug

Se un import XPWE sembra vuoto o errato:
1.  Verificare se nella UI di Import è stata selezionata la Mappatura.
2.  Controllare i log di Python per "Back-propagation": deve dire quanti item sono stati collegati.
3.  Verificare su Mongo la collextion `wbs_nodes`:
    - `level`: deve essere > 0.
    - Se è 0 o 99, la mappatura non ha funzionato.

---
Vedi anche:
- `10-importer-python.md` per i concetti generali.
