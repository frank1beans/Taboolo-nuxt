# MongoDB Serialization Guide

## Problema

Quando si utilizzano documenti MongoDB con Nuxt 3, è necessario convertirli in oggetti JavaScript plain prima di inviarli al client. Questo perché:

1. **ObjectId** di MongoDB non è serializzabile in JSON
2. **Date** e altri tipi MongoDB possono causare problemi di rendering
3. I documenti Mongoose hanno metodi e proprietà che non dovrebbero essere esposti al client

## Soluzione

Usa le funzioni di utility `serializeDoc` e `serializeDocs` fornite in `server/utils/serialize.ts`.

## Come usare

### 1. Query singola

```typescript
import { defineEventHandler } from 'h3';
import { Project } from '#models';
import { serializeDoc } from '#utils';

export default defineEventHandler(async (event) => {
  const project = await Project.findById(id).lean(); // Usa .lean()
  return serializeDoc(project); // Serializza prima di restituire
});
```

### 2. Query multiple

```typescript
import { defineEventHandler } from 'h3';
import { Project } from '#models';
import { serializeDocs } from '#utils';

export default defineEventHandler(async () => {
  const projects = await Project.find().lean(); // Usa .lean()
  return serializeDocs(projects); // Serializza array
});
```

### 3. Documenti creati/aggiornati

```typescript
import { defineEventHandler } from 'h3';
import { Project } from '#models';
import { serializeDoc } from '#utils';

export default defineEventHandler(async (event) => {
  const project = await Project.create(body);
  return serializeDoc(project.toObject()); // Usa .toObject() per nuovi documenti
});
```

## Best Practices

1. **Sempre usa `.lean()`** nelle query MongoDB quando possibile
   - `.lean()` restituisce oggetti JavaScript plain invece di documenti Mongoose
   - È più veloce e usa meno memoria

2. **Serializza prima di restituire** ogni documento MongoDB al client
   - Usa `serializeDoc()` per oggetti singoli
   - Usa `serializeDocs()` per array

3. **Converti `_id` in `id`**
   - Le funzioni di serializzazione lo fanno automaticamente
   - Rimuovono `_id` e `__v` dai documenti

## Esempio completo

```typescript
import { defineEventHandler, createError } from 'h3';
import { Project, Estimate } from '#models';
import { serializeDoc, serializeDocs } from '#utils';

export default defineEventHandler(async (event) => {
  try {
    // Query con .lean()
    const project = await Project.findById(id).lean();
    const estimates = await Estimate.find({ project_id: id }).lean();

    // Serializza prima di restituire
    return {
      ...serializeDoc(project),
      estimates: serializeDocs(estimates),
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error fetching data',
    });
  }
});
```

## Risultato

I dati serializzati avranno:
- ✅ `id` come stringa (invece di ObjectId)
- ✅ Nessun `_id`
- ✅ Nessun `__v`
- ✅ Tutti i campi convertiti in tipi JSON-safe

## File corretti

I seguenti endpoint sono già stati aggiornati per usare la serializzazione corretta:
- `server/api/projects/index.get.ts` - Lista progetti
- `server/api/projects/[id].get.ts` - Dettaglio progetto
- `server/api/projects/index.post.ts` - Crea progetto
- `server/api/projects/[id].put.ts` - Aggiorna progetto
- `server/api/projects/[id]/project-estimates.get.ts` - Lista preventivi
- `server/api/projects/[id]/estimate/[estimateId].get.ts` - Dettaglio preventivo
- `server/api/projects/[id]/wbs/index.get.ts` - Struttura WBS
- `server/api/projects/[id]/price-catalog.get.ts` - Catalogo prezzi
