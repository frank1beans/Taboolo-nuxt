# MongoDB serialization (Nuxt API)

Quando si risponde dalle API Nuxt, i documenti MongoDB/Mongoose vanno convertiti in JSON safe.

Problemi tipici:

- `ObjectId` non e' serializzabile in JSON.
- `Date` e tipi custom possono generare mismatch lato client.
- I documenti Mongoose espongono metodi e metadata inutili per il frontend.

## Soluzione

Usa le utility in `server/utils/serialize.ts`:

- `serializeDoc(doc)` per singoli documenti
- `serializeDocs(docs)` per array

## Linee guida

- Usa sempre `.lean()` nelle query quando possibile.
- Per `create`/`update`, usa `doc.toObject()` prima di serializzare.
- Serializza sempre prima di restituire la risposta al client.
- Se hai campi annidati con ObjectId (es. `project_id`), convertili a stringa manualmente.

## Esempi

### Query singola

```ts
import { defineEventHandler } from 'h3';
import { Project } from '#models';
import { serializeDoc } from '#utils/serialize';

export default defineEventHandler(async () => {
  const project = await Project.findById(id).lean();
  return serializeDoc(project);
});
```

### Query multiple

```ts
import { defineEventHandler } from 'h3';
import { Project } from '#models';
import { serializeDocs } from '#utils/serialize';

export default defineEventHandler(async () => {
  const projects = await Project.find().lean();
  return serializeDocs(projects);
});
```

### Create o update

```ts
import { defineEventHandler } from 'h3';
import { Project } from '#models';
import { serializeDoc } from '#utils/serialize';

export default defineEventHandler(async (event) => {
  const project = await Project.create(body);
  return serializeDoc(project.toObject());
});
```

## Nota importante

`serializeDoc` non serializza in profondita campi annidati. Se servono ID annidati, convertili esplicitamente.
