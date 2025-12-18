# 00 - Preambolo e metodo di studio

Questo percorso ("Studente") non è una guida rapida: è un corso strutturato per arrivare a due obiettivi pratici:

1) capire davvero come funziona Taboolo (dalla UI al DB, passando per le API);
2) essere in grado di ricostruire il progetto da zero (o rifattorizzarlo) senza dipendere dal copia/incolla.

Se lo usi come un libro da consultazione, ti aiuta comunque. Se lo usi come un corso, ti cambia il modo di lavorare sulla repo.

## 00.1 - Cosa stai per costruire (in una frase)

Una web app Nuxt in cui:

- il backend è dentro Nuxt (Nitro): espone API HTTP in `server/api/`;
- i dati vivono in MongoDB (Mongoose): schemi in `server/models/`;
- la UI è centrata su griglie (AG Grid) per analisi e confronto;
- una parte critica di parsing/import (SIX + Excel) è delegata a un servizio Python.

## 00.2 - La mappa mentale base (la useremo sempre)

Per non perderti, ragiona sempre così:

1) UI: cosa vede/fà l'utente? (pagina, tabella, filtro, wizard)
2) API: che endpoint viene chiamato? (`/api/...`)
3) Service: dove sta la logica applicativa? (`server/services/...`)
4) DB: che query fa? (Mongoose `find`, `aggregate`, `update`)
5) Contract: che forma hanno i dati? (`app/types/*`, `server/utils/contracts.ts`)
6) Integrazioni: c'è Python? c'è file upload? c'è caching?

Se impari questo ciclo, puoi capire praticamente qualunque feature della repo.

## 00.3 - Come leggere questo corso (3 modalità)

- Modalità "zero assoluto": segui l'indice in `docs/SUMMARY.md` dall'inizio; fai almeno gli esercizi mini.
- Modalità "dev che entra nel progetto": leggi `docs/studente/parte-a-basi/05-tour-repo.md`, poi `docs/studente/parte-c-dominio-feature/09-dominio-taboolo-data.md` e `docs/studente/parte-c-dominio-feature/10-importer-python.md`.
- Modalità "maintainer": usa appendici e runbook come reference, ma assicurati di conoscere bene import e modello dati.

## 00.4 - Metodo di studio consigliato (non teorico)

Ogni volta che leggi un capitolo, prova a produrre 3 cose:

1) una frase che spiega "che problema risolve" quella parte di codice;
2) una traccia del flusso (anche su carta) UI -> API -> DB;
3) un micro cambiamento verificabile (anche solo una `console.log` o una colonna in più in griglia).

Perché funziona: il progetto è reale, quindi la comprensione deve diventare comportamento osservabile.

## 00.5 - Regole per non sabotarti (anti-pattern comuni)

- Non aprire 30 file "a caso": parti sempre da una pagina e segui le chiamate.
- Non cambiare 10 cose insieme: fai piccoli passi, testabili, committabili.
- Non fidarti dei nomi: cerca i tipi e cerca le query. I nomi mentono, i dati no.
- Non "aggiustare" un bug senza capire il dominio: spesso è un'invariante violata.

## 00.6 - Come fare esperimenti in modo sicuro

Quando vuoi provare un cambiamento:

1) crea un branch: `git switch -c studio/<tema>`
2) fai un cambiamento piccolo
3) verifica (browser + Network tab + log server)
4) se serve, torna indietro con un reset locale, non toccare la main

Questo ti permette di imparare senza paura di "rompere tutto".

## 00.7 - Che cosa consideriamo "stabile" (e cosa no)

In una repo viva, non tutto è allo stesso livello di maturità.

In generale, in Taboolo sono stabili:

- modello dati core (progetti, preventivi, voci, WBS, offerte) e persistenza Mongo;
- import SIX in modalità raw (passando dal servizio Python e poi persistendo lato Nitro);
- import offerte (ritorni) da Excel (modalità LX/MX);
- viste principali: dashboard progetto, dettaglio voci, listino, confronto.

Sono tipicamente in evoluzione (o legacy/placeholder):

- alcune API e funzioni presenti in `app/lib/api-client.ts` ma non implementate nel backend;
- parti legacy in `old/` usate come riferimento per migrazione;
- pagine placeholder come `/catalogs` (se non collegate a flussi reali).

## 00.8 - Prima verifica (senza scrivere codice)

1) Apri `docs/studente/parte-a-basi/05-tour-repo.md` e ricopia su un foglio:
   - dove vive la UI
   - dove vivono le API
   - dove vivono i modelli Mongo
2) Apri `docs/studente/appendici/riferimento/api-routes.md` e individua:
   - import SIX (preview e import)
   - import offerte (ritorni)
   - confronto

Se riesci a rispondere a queste 2 cose, sei pronto a partire con il capitolo 01.
