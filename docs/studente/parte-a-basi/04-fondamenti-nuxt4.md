# 04 - Nuxt 4: come sta in piedi l'app (routing, SSR, server, convenzioni)

Obiettivo: sapere dove mettere le mani in un progetto Nuxt 4 come Taboolo, e capire cosa Nuxt fa "automaticamente" per te (auto-import, routing, server API).

Questo capitolo è fondamentale perché Taboolo usa Nuxt in modo completo:

- frontend in `app/` (pages, componenti, composables)
- backend Nitro in `server/` (API, plugin, modelli, servizi)

## 04.1 - Struttura Nuxt in questa repo (la cosa più importante)

In `nuxt.config.ts` c'è:

- `srcDir: 'app/'`

Quindi:

- il "frontend Nuxt" non è in root, ma in `app/`
- `app/pages/` = routing
- `app/layouts/` = layout
- `app/plugins/` = plugin Nuxt (alcuni solo client)
- `server/api/` = endpoint Nitro automaticamente montati sotto `/api`

## 04.2 - Routing a file: `app/pages/*`

Nuxt genera le route in base ai file:

- `app/pages/projects/index.vue` -> `/projects`
- `app/pages/projects/[id]/index.vue` -> `/projects/:id`
- `app/pages/projects/[id]/estimate/[estimateId]/detail.vue` -> `/projects/:id/estimate/:estimateId/detail`

Le parentesi quadre indicano segmenti dinamici:

- `[id]` -> parametro `id`
- `[estimateId]` -> parametro `estimateId`

Sul client li leggi con `useRoute()`:

```ts
const route = useRoute()
const projectId = route.params.id as string
```

Sul server (Nitro) li leggi con `getRouterParam(event, 'id')`.

## 04.3 - Layout: `app/layouts/*`

Un layout è un "guscio" riusabile intorno alle pagine.

Esempi:

- `app/layouts/default.vue`
- `app/layouts/SidebarLayout.vue`

Una pagina può scegliere layout con `definePageMeta` (vedi capitolo 03).

Regola pratica:

- layout: struttura (header, sidebar, content)
- pagina: dati e logica di quella route
- componenti: pezzi riusabili

## 04.4 - SSR, SPA, e la domanda: "dove gira questo codice?"

Nuxt può:

- renderizzare sul server (SSR) e poi idratare sul client
- renderizzare solo sul client (SPA-like)

In sviluppo spesso non ci pensi, ma alcuni bug nascono qui:

- `window is not defined` -> stai usando `window` in codice che gira anche sul server
- accesso a `localStorage` -> solo client

Soluzioni tipiche:

- usare plugin `.client.ts` (solo client)
- usare `process.client` / `import.meta.client` (quando serve)
- spostare logica in `onMounted` (client-only)

## 04.5 - Plugin: `app/plugins/*`

I plugin Nuxt servono per:

- registrare librerie globali (es. AG Grid)
- configurare client comuni (es. API client)
- registrare componenti/layout globali

In questa repo:

- `app/plugins/ag-grid.client.ts` è client-only
- `app/plugins/sonner.client.ts` è client-only
- `app/plugins/api-client.ts` configura il client per le chiamate HTTP

Regola: se un plugin tocca DOM o browser API, deve essere `.client.ts`.

## 04.6 - Auto-import (la "magia" che disorienta)

Nuxt auto-importa molte funzioni:

- `useRoute`, `useRouter`, `useFetch`
- `useRuntimeConfig`
- `definePageMeta`

Quindi potresti non vedere `import { useRoute } from 'vue-router'`.

Se ti sembra magia:

1) controlla documentazione Nuxt (auto-imports)
2) cerca nel progetto: `rg "useRuntimeConfig\\("`

## 04.7 - Modules: cosa usiamo davvero

Da `package.json` e `nuxt.config.ts`:

- `@nuxt/ui` (componenti UI)
- `@nuxt/icon` (icone)
- `@nuxtjs/color-mode` (dark/light mode)
- `@pinia/nuxt` (store Pinia)

Ci sono anche dipendenze presenti ma non necessariamente integrate al 100% nel momento in cui leggi:

- `@nuxtjs/i18n` (locales in `locales/`)
- `@nuxtjs/tailwindcss` (Tailwind è presente, ma la config può evolvere)

Nel corso distinguiamo sempre:

- ciò che è usato nel flusso reale
- ciò che è presente come eredità/placeholder

## 04.8 - Server dentro Nuxt (Nitro): `server/*`

Questa repo usa Nitro come backend interno:

- `server/api/*` -> endpoints `/api/*`
- `server/plugins/*` -> plugin Nitro (es. connessione Mongo)
- `server/models/*` -> schemi Mongoose
- `server/services/*` -> logica applicativa
- `server/utils/*` -> utility e mapper

È una scelta architetturale forte: frontend e backend sono nello stesso progetto, con un confine chiaro (API).

## 04.9 - Alias Nitro: `#models`, `#services`, ...

In `nuxt.config.ts` trovi:

- `nitro.alias` (es. `#models` -> `server/models`)

Quindi puoi scrivere:

```ts
import { Project } from '#models'
import { buildAndUpsertWbsFromItems } from '#services/WbsService'
```

Questi alias rendono il codice più leggibile e riducono i path lunghi.

## 04.10 - Esercizi "da Nuxt" (da fare in ordine)

1) Routing:
   - apri `app/pages/projects/[id]/estimate/[estimateId]/detail.vue`
   - individua come legge `id` e `estimateId`
2) Layout:
   - apri `app/layouts/SidebarLayout.vue`
   - individua dove viene renderizzata la pagina (slot)
3) Server API:
   - apri `server/api/projects/index.get.ts`
   - trova come costruisce la lista progetti
4) Plugin:
   - apri `server/plugins/mongoose.ts`
   - individua dove legge la variabile Mongo (runtime config)

Se questi 4 punti ti sono chiari, il "tour della repo" (capitolo 05) diventa molto più facile.
