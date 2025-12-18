# 19 - UI stack: Nuxt UI, Tailwind, tema, layout

Obiettivo: capire come viene costruito l'aspetto dell'app (componenti UI, stile, tema, dark mode) e come mantenere coerenza visiva quando aggiungi nuove feature.

Taboolo non è una "landing": è una web app operativa. Qui l'obiettivo della UI è:

- essere leggibile con molte colonne e tanti dati
- essere veloce (pochi click per arrivare al punto)
- mantenere coerenza (stesso pattern per header, griglie, sidebar)

## 19.1 - Librerie UI usate

Da `package.json` e `nuxt.config.ts`:

- `@nuxt/ui`: componenti UI (bottoni, card, input, modali, ecc.)
- `@nuxt/icon`: icone
- `@nuxtjs/color-mode`: gestione tema (light/dark, system preference)
- Tailwind CSS (utility CSS + tokens)
- AG Grid (griglie avanzate)

## 19.2 - Nuxt UI config: `app/app.config.ts`

File: `app/app.config.ts`

Qui configuri:

- palette (primary, neutral)
- varianti default di input/select/textarea
- stile di componenti come Card (slot class)

Regola pratica:

- se vuoi cambiare lo "stile globale" di un componente Nuxt UI, lo fai qui
- se vuoi cambiare lo stile di un punto specifico, lo fai nel componente/pagina

## 19.3 - CSS globale: `app/assets/css/main.css`

File: `app/assets/css/main.css`

Qui trovi tipicamente:

- import Tailwind / layers
- variabili CSS (tokens) per colori e bordi
- override globali (es. body, background, typographic defaults)

Per una app data-heavy, i token più importanti sono:

- background e surface (card, sidebar)
- border e divider
- colori "semantic" (success/warn/error)

## 19.4 - Tailwind: perché è utile qui

Tailwind ti dà:

- utility per spaziatura e layout (flex, grid)
- controllo fine su responsive
- composizione rapida senza CSS "spaghetti"

In Taboolo però non vuoi una UI incoerente. Quindi:

- usa Tailwind per layout e piccoli aggiustamenti
- usa componenti Nuxt UI per elementi standard (input, button, card)
- evita classi random ripetute: preferisci componenti o classi riusabili

## 19.5 - Dark mode: `@nuxtjs/color-mode`

In `nuxt.config.ts` trovi `colorMode`:

- preference: system
- fallback: light

Risultato:

- l'app può seguire il tema del sistema operativo
- le classi / variabili possono cambiare tra light e dark

Se tocchi colori o background, verifica sempre entrambi i temi.

## 19.6 - Icone: `@nuxt/icon`

`@nuxt/icon` permette di usare icone senza gestire asset manuali.

Regola pratica:

- usa icone in modo consistente (stesso set, stessa dimensione)
- preferisci icone come "supporto" al testo, non come unico segnale

## 19.7 - Layout pattern: come mantenere coerenza

Per Taboolo è importante che ogni pagina "importante" abbia:

- header chiaro (titolo + contesto progetto/preventivo)
- azioni in vista (import, export, confronto)
- area principale (griglia)
- sidebar opzionale (WBS)

Componenti che ti aiutano:

- `app/components/layout/MainPage.vue`
- `app/components/layout/PageHeader.vue`
- `app/components/layout/DataGridPage.vue`

Se aggiungi una nuova pagina data-heavy, partire da `DataGridPage` ti evita di reinventare tutto.

## 19.8 - Esercizio: rendere una pagina più leggibile

Scegli una pagina a griglia e migliora 2 cose:

1) spacing: margini/padding tra header e griglia
2) affordance: un bottone/azione più evidente

Vincoli:

- non cambiare logica
- non cambiare API

Scopo: imparare a lavorare sul layer UI senza toccare il dominio.
