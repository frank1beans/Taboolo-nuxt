# 15 - Cartella `old/`: leggere il legacy e migrare concetti

La cartella `old/` contiene codice legacy (React) che non viene eseguito dall'app Nuxt,
ma e' utile per:

- capire requisiti originali (come ragionava il prodotto prima);
- recuperare logiche di filtro (WBS, catalogo);
- migrare gradualmente comportamenti (caching, query keys, staleTime).

## 15.1 - Cosa c'e' in `old/src/hooks/queries`

File interessanti:

- `old/src/hooks/queries/useWbsQueries.ts`
- `old/src/hooks/queries/usePriceCatalog.ts`
- `old/src/hooks/queries/usePropertySchemas.ts`

Questi hook usano `@tanstack/react-query` e chiamano un `api-client`.

## 15.2 - Migrazione concettuale: React Query -> Nuxt useFetch / Vue Query

Nel legacy vedi pattern:

```ts
useQuery({ queryKey, queryFn, staleTime })
```

In Nuxt puoi scegliere:

1) `useFetch`:
   - SSR-aware
   - semplice
   - ottimo per la maggior parte delle pagine "dati + griglia"
2) `@tanstack/vue-query`:
   - caching e invalidation piu' sofisticati
   - utile se hai molte dipendenze tra query e vuoi controllare staleTime per davvero

Domanda guida:

> Questa schermata ha bisogno di caching/invalidation sofisticati, o basta `useFetch`?

## 15.3 - Migrazione WBS: differenze tra legacy e nuovo

### Legacy: WBS tree dal catalogo (WBS6/WBS7)

In `useWbsQueries.ts` trovi:

- costruzione albero WBS6/WBS7 da items (`useBuildWbsTree`)
- filtro dati per nodo selezionato (`useWbsFilteredData`)

Questo funziona bene quando i dati hanno campi:

- `wbs6_code`, `wbs6_description`
- `wbs7_code`, `wbs7_description`

### Nuovo: WBS tree da `wbs_hierarchy`

In Nuxt, `useWbsTree` (file: `app/composables/useWbsTree.ts`) costruisce l'albero da:

- `wbs_hierarchy.wbs01..wbs07` (default)

Oppure (in listino/confronto) usa `getLevels` custom per WBS6/WBS7.

Esercizio:

1) confronta `old/src/hooks/queries/useWbsQueries.ts` con `app/composables/useWbsTree.ts`
2) elenca pro/contro:
   - albero da WBS6/WBS7 e' piu' "stabile" per listino
   - albero da WBS01..WBS07 e' piu' ricco, ma dipende dalla qualita' del mapping WBS

## 15.4 - Property schemas (legacy) e fallback attuale

Legacy:

- `usePropertySchemas` chiama `api.getPropertySchemas()` e cache-a staticamente.

Nuovo:

- `app/lib/api-client.ts` include logiche:
  - static only vs remote
  - fallback su asset statico
  - eventuale preferenza fallback

Esercizio:

- cerca `PropertySchemaResponse` in `app/lib/api-client.ts` e ricostruisci:
  - da dove prova a caricare gli schemi
  - quando cade in fallback

## 15.5 - Cosa NON migrare (consiglio pragmatico)

Non migrare "per nostalgia":

- prima verifica se il codice legacy e' ancora coerente col dominio attuale
- evita di portare modelli dati vecchi (commessa/computo) se ora esistono modelli nuovi

Regola pratica:

> Migra concetti (pattern) piu' che implementazioni (righe di codice).
