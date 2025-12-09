# Database Schema Plan (MongoDB / Mongoose)

Based on `types/api.ts`, here is the proposed Mongoose schema structure.

## Collections

### 1. `Commesse` (Collection: `commesse`)
```typescript
interface Commessa {
  _id: ObjectId;
  nome: string;
  codice: string; // Unique index
  descrizione?: string;
  note?: string;
  business_unit?: string;
  revisione?: string;
  stato: 'setup' | 'in_corso' | 'chiusa';
  created_at: Date;
  updated_at: Date;
  // Relationship: Computi are children, referenced by ID or embedded?
  // Referenced is better for scalability.
  computi: ObjectId[]; // Reference to Computi
}
```

### 2. `Computi` (Collection: `computi`)
```typescript
interface Computo {
  _id: ObjectId;
  commessa_id: ObjectId; // Ref to Commesse
  nome: string;
  tipo: 'progetto' | 'ritorno';
  disciplina?: string;
  revisione?: string;
  is_baseline: boolean;
  impresa?: string;
  round_number?: number;
  importo_totale?: number;
  delta_vs_progetto?: number;
  percentuale_delta?: number;
  note?: string;
  file_nome?: string;
  created_at: Date;
  updated_at: Date;
  matching_report?: Record<string, any>;
}
```

### 3. `WBSNodes` (Collection: `wbs_nodes`)
Ideally, WBS can be stored as a single document per Commessa if not too large, or as a tree structure using Materialized Path or Parent References.
Given `ApiWbsNode` recursive structure:

Option A: Embedded in Commessa (Simple, fast read, hard to query deep nodes independently)
Option B: Separate Collection (Better for large trees)

Let's go with **Option B** (Separate Collection) but maybe denormalized.

```typescript
interface WbsNode {
  _id: ObjectId;
  commessa_id: ObjectId;
  parent_id?: ObjectId;
  type: 'spaziale' | 'wbs6' | 'wbs7';
  code: string;
  description?: string;
  level: number;
  importo: number; // Computed/Cached
  path: { level: number; code: string }[]; // Materialized path for breadcrumbs
  // specific fields
  wbs6_id?: ObjectId; // For wbs7
  wbs_spaziale_id?: ObjectId; // For wbs6
}
```

### 4. `ComputoVoci` (Collection: `computo_voci`)
The items. Can be millions. Must be a separate collection.

```typescript
interface ComputoVoce {
  _id: ObjectId;
  computo_id: ObjectId; // Index
  commessa_id: ObjectId; // Index (for fast aggregation)
  codice: string;
  descrizione: string;
  descrizione_estesa?: string;
  unita_misura?: string;
  quantita: number;
  prezzo_unitario: number;
  importo: number;
  
  // WBS Links
  wbs6_id?: ObjectId;
  wbs7_id?: ObjectId;
  wbs_path_ids?: ObjectId[];
  
  // Metadata for aggregation
  round_number?: number;
  impresa?: string;
}
```

### 5. `PriceCatalogItems` (Collection: `price_catalog`)
```typescript
interface PriceCatalogItem {
  _id: ObjectId;
  commessa_id: ObjectId;
  product_id: string;
  item_code: string;
  item_description?: string;
  unit_id?: string;
  wbs6_code?: string;
  price_lists?: Map<string, number>;
  extra_metadata?: any;
  // Embeddings for semantic search?
  embedding?: number[];
}
```

### 6. `Settings` (Collection: `settings`)
Singleton or per-user/organization.
```typescript
interface Settings {
  delta_minimo_critico: number;
  delta_massimo_critico: number;
  // ...
}
```

### 7. `ImportConfigs` (Collection: `import_configs`)
```typescript
interface ImportConfig {
  commessa_id?: ObjectId;
  nome: string;
  configuration: any;
}
```

## Migration Strategy
1.  Setup Mongoose connection in Nuxt server (`server/plugins/mongoose.ts` or `server/utils/db.ts`).
2.  Define Mongoose Models in `server/models/`.
3.  Port logic from Python (or inferred) to Mongoose queries.
