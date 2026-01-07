# Struttura Frontend

Panoramica della struttura frontend Nuxt.

---

## Directory

```
app/
├── pages/           # Route e pagine
├── components/      # Componenti Vue
├── composables/     # Hook riutilizzabili
├── assets/          # CSS e risorse
├── layouts/         # Layout pagine
└── stores/          # Pinia stores
```

---

## Pagine Principali

| Pagina | Percorso | File |
|--------|----------|------|
| Dashboard | `/` | `pages/index.vue` |
| Progetti | `/projects` | `pages/projects/index.vue` |
| Progetto | `/projects/:id` | `pages/projects/[id]/index.vue` |
| Import | `/projects/:id/import` | `pages/projects/[id]/import/index.vue` |
| Preventivo | `/projects/:id/estimate/:estimateId` | `pages/projects/[id]/estimate/[estimateId]/index.vue` |
| Listino | `/projects/:id/pricelist` | `pages/projects/[id]/pricelist/index.vue` |
| Conflitti | `/projects/:id/conflicts` | `pages/projects/[id]/conflicts/index.vue` |
| Analytics | `/analytics` | `pages/analytics/index.vue` |
| Catalogo | `/catalogs` | `pages/catalogs/index.vue` |
| Price Estimator | `/price-estimator` | `pages/price-estimator/index.vue` |

---

## Componenti Chiave

### Layout

- `AppShell.vue` - Shell principale
- `Sidebar.vue` - Navigazione laterale
- `Topbar.vue` - Barra superiore
- `PageHeader.vue` - Header pagina

### Data Grid

- `DataGrid.vue` - Tabella principale
- `DataGridToolbar.vue` - Filtri e azioni
- `DataGridActions.vue` - Menu contestuale

### Import

- `ImportWizard.vue` - Wizard offerte
- `FileDropZone.vue` - Upload file

### Analytics

- `SemanticMap.vue` - Mappa Plotly
- `MapToolbar.vue` - Controlli mappa

---

## Stili

- `app/assets/css/main.css` - Stili globali
- Tailwind CSS per utility classes
- CSS custom properties per theming

---

## Stores (Pinia)

- `useProjectStore` - Stato progetto corrente
- `useSelectionStore` - Selezione elementi
- `useFilterStore` - Filtri attivi
