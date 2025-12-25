# 25 - Global Analytics API e Semantic Map: UMAP, visualizzazione, composables

Obiettivo: capire gli endpoint di analytics globale e i composables per la mappa semantica. Questo modulo permette di visualizzare le voci di listino in uno spazio 2D/3D calcolato con UMAP, colorare per cluster/categoria, e analizzare selezioni.

## 25.1 - Architettura overview

```mermaid
flowchart LR
    subgraph Frontend
        A[Analytics Page] --> B[useSemanticMap]
        A --> C[useSemanticMapAnalytics]
        B --> D[Plotly.js]
        C --> D
    end
    
    subgraph Nitro
        E[global-compute-map.post.ts]
        F[global-map.post.ts]
        G[global-price-analysis.post.ts]
    end
    
    subgraph Python
        H[/analytics/global/compute-map]
        I[/analytics/global/map-data]
        J[/analytics/global/price-analysis]
    end
    
    B --> F
    B --> E
    F --> I
    E --> H
    G --> J
```

## 25.2 - API Endpoints: Nitro → Python proxy

Tutti e tre gli endpoint sono proxy che inoltrano le richieste al backend Python.

### POST `/api/analytics/global-compute-map`

**File**: `server/api/analytics/global-compute-map.post.ts`

**Scopo**: Triggera il calcolo UMAP su embedding di più progetti.

**Request body**:
```typescript
interface GlobalComputeMapParams {
    project_ids?: string[] | null  // null = tutti i progetti
    force?: boolean                // true = ricalcola anche se esiste
}
```

**Python endpoint**: `POST /analytics/global/compute-map`

---

### POST `/api/analytics/global-map`

**File**: `server/api/analytics/global-map.post.ts`

**Scopo**: Recupera i dati della mappa (coordinate x, y, z, cluster).

**Request body**:
```typescript
interface GlobalMapParams {
    project_ids?: string[] | null
    year?: number | null
    business_unit?: string | null
}
```

**Python endpoint**: `POST /analytics/global/map-data`

**Response tipica**:
```json
{
    "points": [
        {
            "id": "...",
            "x": 1.23,
            "y": -0.45,
            "z": 0.78,
            "cluster": 3,
            "label": "VP.01.002",
            "description": "Parete cartongesso...",
            "price": 45.00,
            "amount": 1500.00,
            "category": "PARETI VERTICALI"
        }
    ],
    "clusters": [
        {"id": 0, "count": 45, "label": "Pareti standard"},
        {"id": 1, "count": 23, "label": "Controsoffitti"}
    ]
}
```

---

### POST `/api/analytics/global-price-analysis`

**File**: `server/api/analytics/global-price-analysis.post.ts`

**Scopo**: Esegue analisi prezzi multi-progetto.

**Request body**:
```typescript
interface GlobalAnalysisParams {
    project_ids?: string[] | null
    year?: number | null
    business_unit?: string | null
    wbs6_filter?: string | null
    top_k?: number                  // default 30
    min_similarity?: number         // default 0.55
    mad_threshold?: number          // default 2.0
    min_category_size?: number      // default 3
    estimation_method?: string      // "weighted_median" | "trimmed_mean"
    include_neighbors?: boolean     // default true
}
```

**Python endpoint**: `POST /analytics/global/price-analysis`

## 25.3 - Composable: useSemanticMap

**File**: `app/composables/useSemanticMap.ts`

Gestisce lo stato base della mappa semantica.

### Interface Point

```typescript
interface Point {
    id: string;
    x: number;
    y: number;
    z: number;
    cluster: number;
    label: string;
    description: string;
    price?: number;
    amount?: number;
    unit?: string;
    category?: string;  // WBS06
    score?: number;
}
```

### Interface Cluster

```typescript
interface Cluster {
    id: number;
    count: number;
    label?: string;
    color?: string;
}
```

### Stato esposto

| Ref | Tipo | Descrizione |
|-----|------|-------------|
| `points` | `Point[]` | Tutti i punti della mappa |
| `clusters` | `Cluster[]` | Cluster rilevati |
| `status` | `'idle'|'loading'|'error'|'success'` | Stato fetch |
| `error` | `string|null` | Messaggio errore |
| `isLoading` | `boolean` | Computed: status === 'loading' |
| `mode` | `'2d'|'3d'` | Modalità visualizzazione |
| `searchQuery` | `string` | Query di ricerca |
| `searchResults` | `string[]` | ID dei punti che matchano |
| `selectedCluster` | `number|null` | Cluster selezionato |

### Metodi

| Metodo | Scopo |
|--------|-------|
| `fetchData()` | Carica dati mappa da API |
| `performSearch(query)` | Filtra punti client-side |
| `triggerCompute()` | Ricalcola UMAP (con conferma) |

### Esempio uso

```typescript
const { points, clusters, isLoading, mode, triggerCompute } = useSemanticMap(projectId);

// Cambia modalità
mode.value = '3d';

// Ricalcola
await triggerCompute();
```

## 25.4 - Composable: useSemanticMapAnalytics

**File**: `app/composables/useSemanticMapAnalytics.ts`

Gestisce selezione, interazione e analisi sui punti.

### Stato esposto

| Ref | Tipo | Descrizione |
|-----|------|-------------|
| `selectedPointIds` | `Set<string>` | ID punti selezionati (lasso/box) |
| `clickedPointId` | `string|null` | Punto cliccato per neighbors |
| `neighborIds` | `string[]` | Vicini del punto cliccato |
| `colorBy` | `'cluster'|'amount'|'category'|'score'|'outlier'` | Colorazione |
| `clusterPalette` | `string[]` | Palette colori cluster |
| `selectionStats` | `object` | Statistiche selezione |

### Metodi

| Metodo | Scopo |
|--------|-------|
| `setSelection(ids, points)` | Imposta selezione |
| `clearSelection()` | Pulisce selezione |
| `setClickedPoint(id, points, mode)` | Calcola neighbors |
| `clearClickedPoint()` | Pulisce click |
| `getClickedPointNeighbors(points, mode)` | Ritorna top 10 neighbors |

### Esempio uso

```typescript
const analytics = useSemanticMapAnalytics();

// Dopo selezione lasso
analytics.setSelection(['id1', 'id2', 'id3'], points.value);

// Dopo click su punto
analytics.setClickedPoint('id1', points.value, '2d');

// Visualizza neighbors
console.log(analytics.neighborIds.value); // ['id5', 'id8', 'id12', ...]
```

## 25.5 - Funzioni helper esportate

### buildMarkerConfig

Costruisce configurazione marker per Plotly.

```typescript
const markerConfig = buildMarkerConfig({
    points,
    colorBy: 'cluster',
    searchResults: [],
    selectedPointIds: new Set(),
    clickedPointId: null,
    neighborIds: [],
    pointSize: 6,
    clusterPalette: ['#60A5FA', ...],
    outlierIds: new Set()
});

// Usa in Plotly
trace.marker = markerConfig;
```

Logica priorità colori:
1. Selezione attiva → grigi non-selezionati
2. Ricerca attiva → grigi non-matchanti
3. Neighbors attivi → rosso neighbors, nero target, grigi altri
4. ColorBy mode → outlier/category/amount/cluster

### buildNeighborLinesTrace

Costruisce trace linee per connettere punto a neighbors.

```typescript
const linesTrace = buildNeighborLinesTrace(
    points.value,
    clickedPointId,
    neighborIds,
    '2d'
);

// Aggiungi a Plotly data array
data.push(linesTrace);
```

### exportToCsv

Esporta punti in CSV.

```typescript
// Esporta tutti
exportToCsv(points.value, 'mappa_completa.csv');

// Esporta solo selezione
const selected = points.value.filter(p => selectedPointIds.value.has(p.id));
exportToCsv(selected, 'selezione.csv');
```

## 25.6 - Pagina Analytics

**File**: `app/pages/analytics/index.vue` (~47KB)

Features principali:

- **Visualizzazione 2D/3D** con Plotly.js
- **Selezione lasso/box** per analisi aggregata
- **Colorazione dinamica** per cluster, WBS6, importo, outlier
- **Ricerca nearest neighbors** su click
- **Export CSV** selezione/tutti
- **Poli attrattori** dal gravitational clustering
- **Sidebar** con filtri e statistiche

## 25.7 - Integrazione completa

```typescript
// In analytics/index.vue

// Composables
const { points, clusters, isLoading, mode, fetchData, triggerCompute } = useSemanticMap(projectId);
const analytics = useSemanticMapAnalytics();

// Plotly traces
const traces = computed(() => {
    const mainTrace = {
        type: mode.value === '3d' ? 'scatter3d' : 'scattergl',
        mode: 'markers',
        x: points.value.map(p => p.x),
        y: points.value.map(p => p.y),
        z: points.value.map(p => p.z),
        marker: buildMarkerConfig({
            points: points.value,
            colorBy: analytics.colorBy.value,
            // ... other options
        }),
        customdata: points.value,
        hovertemplate: '%{customdata.label}<br>%{customdata.description}<extra></extra>'
    };
    
    const result = [mainTrace];
    
    // Add neighbor lines if clicked
    if (analytics.clickedPointId.value) {
        const lines = buildNeighborLinesTrace(
            points.value,
            analytics.clickedPointId.value,
            analytics.neighborIds.value,
            mode.value
        );
        if (lines) result.push(lines);
    }
    
    return result;
});

// Handle click
function onPlotlyClick(event) {
    const pointIndex = event.points[0].pointIndex;
    const point = points.value[pointIndex];
    analytics.setClickedPoint(point.id, points.value, mode.value);
}

// Handle selection
function onPlotlySelected(event) {
    const ids = event.points.map(p => points.value[p.pointIndex].id);
    analytics.setSelection(ids, points.value);
}
```

## 25.8 - Debug e troubleshooting

### Mappa vuota

1. Verifica che Python backend sia attivo su `PYTHON_API_URL`
2. Controlla che esistano item con embedding nel DB
3. Esegui "Compute UMAP" per generare coordinate

### Coordinare tutte a 0

L'UMAP non è stato calcolato. Clicca "Compute UMAP" nella UI.

### Colori non corrispondono

Verifica che `colorBy` sia impostato correttamente e che i dati abbiano i campi richiesti (`cluster`, `category`, `amount`).

### Export CSV incompleto

La funzione esporta solo i campi presenti in `Point`. Per campi custom, modifica `exportToCsv`.

