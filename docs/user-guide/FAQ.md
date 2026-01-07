# FAQ - Domande Frequenti

Risposte rapide alle domande più comuni.

---

## Generale

### Cos'è Taboolo?
È un'applicazione per gestire preventivi edilizi e confrontare offerte di fornitori. Importi il computo, importi le offerte Excel, e vedi subito le differenze.

### Come accedo all'aiuto?
Premi **F1** in qualsiasi momento, oppure clicca il pulsante **?** nella barra in alto.

### Posso cambiare tra tema chiaro e scuro?
Sì! Clicca l'icona sole/luna nella barra in alto.

---

## Progetti

### Posso eliminare un progetto?
Sì, ma è **irreversibile**. Elimina tutto: preventivi, offerte, listini, alert.

### Posso avere più preventivi nello stesso progetto?
Sì! Puoi importare più versioni o varianti del computo.

### Come faccio a trovare un progetto?
- Dalla Dashboard: vedi i recenti
- Dalla lista Progetti: usa la ricerca
- Dalla barra in alto: cerca per nome

---

## Import

### Che differenza c'è tra LX e MX?
- **LX:** match per codice/descrizione (offerte sintetiche)
- **MX:** match per numero di riga (offerte analitiche)

Guarda il tuo file Excel: se ha codici chiari usa LX, se segue l'ordine del computo usa MX.

### Posso reimportare un file?
Sì, crea un nuovo preventivo. Puoi poi eliminare quello vecchio se non serve.

### L'import impiega troppo tempo
- File grandi richiedono più tempo
- Se fallisce, potrebbe servire aumentare i limiti (contatta l'admin)

### Gli embeddings sono obbligatori?
No, ma senza non potrai usare:
- La mappa semantica
- La ricerca intelligente
- Lo stimatore prezzi

**Consiglio:** Attivali sempre.

---

## Confronto Offerte

### Come vedo chi ha l'offerta migliore?
Nella tabella di confronto, la colonna con il prezzo più basso è evidenziata in **verde**.

### Cosa significa il delta?
È la differenza tra offerta e baseline:
- **Delta positivo (+):** l'offerta costa di più
- **Delta negativo (-):** l'offerta costa di meno

### Posso esportare il confronto?
Sì! Usa il pulsante **Esporta** nella toolbar (Excel o CSV).

---

## Conflitti e Alert

### Cosa significa "addendum"?
Una voce che esiste solo nell'offerta, non nel preventivo originale. Potrebbe essere un extra proposto dal fornitore.

### Devo risolvere tutti gli alert?
Non necessariamente. Puoi:
- **Risolvere** quelli importanti
- **Ignorare** quelli accettabili
- Gli **Info** in genere si possono ignorare

### Come risolvo un match ambiguo?
1. Vai alla pagina Conflitti
2. Apri l'alert
3. Vedi i candidati proposti
4. Seleziona quello corretto

---

## Analytics

### La mappa è vuota
Gli embeddings non sono stati calcolati. Devi reimportare il computo con l'opzione **Embeddings** attiva.

### Come funziona la ricerca semantica?
Trova voci **simili per significato**, non solo per parole esatte.

Esempio: cercando "pavimento in ceramica" trova anche "rivestimento gres porcellanato".

### Posso filtrare per progetto?
Sì! Nella mappa globale puoi filtrare per:
- Progetto
- WBS (categoria)
- Cluster (gruppo semantico)

---

## Stima Prezzi

### Come funziona lo stimatore?
Inserisci una descrizione e Taboolo cerca voci simili nei progetti passati, dandoti un range di prezzo.

### Perché non dà risultati?
- Potrebbero mancare gli embeddings
- La descrizione potrebbe essere troppo generica
- Prova con più dettagli (materiale, spessore, ecc.)

### È affidabile?
È **indicativo**, basato sui dati storici. Usalo come riferimento, non come prezzo definitivo.

---

## Problemi Tecnici

### La pagina non carica
- Ricarica con F5
- Prova a svuotare la cache del browser
- Controlla la connessione

### Ho un errore, cosa faccio?
1. Ricarica la pagina
2. Prova ad aspettare qualche secondo
3. Se persiste, contatta l'amministratore con lo screenshot dell'errore

### L'app è lenta
- Potrebbe essere un file molto grande
- Prova a limitare i filtri
- Per analytics, filtra per progetto specifico

---

## Serve altro aiuto?

- Premi **F1** per l'aiuto contestuale
- Consulta le guide specifiche nel menu a sinistra
- Per problemi tecnici: [Documentazione Tecnica](../technical/troubleshooting.md)
