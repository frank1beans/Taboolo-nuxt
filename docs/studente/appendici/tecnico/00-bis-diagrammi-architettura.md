# Diagrammi Architettura - Visione Completa

> Questa pagina contiene i diagrammi fondamentali per capire come è fatto Taboolo.
>
> **Come usarla**: leggi i diagrammi dall'alto verso il basso. Ogni sezione risponde a una domanda specifica sull'architettura.

---

## 1. Architettura Generale (Vista 10.000 piedi)

> [!TIP]
> Questo è il "big picture": mostra come i tre macro-componenti parlano tra loro.

```mermaid
flowchart TB
    subgraph Client["Browser - Client"]
        Pages["Pages - app/pages/"]
        Components["Components - app/components/"]
        Composables["Composables - app/composables/"]
        Stores["Pinia Stores - app/stores/"]
    end

    subgraph Nuxt["Nuxt Server - Nitro"]
        API["API Endpoints - server/api/"]
        Services["Services - server/services/"]
        Models["Mongoose Models - server/models/"]
        Utils["Utils - server/utils/"]
    end

    subgraph External["Servizi Esterni"]
        Python["Python Importer - FastAPI"]
        MongoDB[("MongoDB Database")]
    end

    Pages --> Components
    Pages --> Composables
    Components --> Composables
    Composables --> Stores

    Pages -.->|"$fetch, useFetch"| API

    API --> Services
    API --> Utils
    Services --> Models
    Utils --> Models

    Models <--> MongoDB
    Utils -.->|"HTTP Proxy multipart"| Python

    Python -.->|"JSON parsed"| Utils

    style Client fill:#e1f5fe
    style Nuxt fill:#fff3e0
    style External fill:#f3e5f5
```

---

## 2. Struttura Cartelle (Dove Sta Cosa)

> [!NOTE]
> Quando devi modificare qualcosa, parti sempre da qui per trovare il file giusto.

```mermaid
flowchart LR
  subgraph Root[Taboolo-nuxt]
    direction TB

    subgraph App[app - Frontend]
      A1[pages]
      A2[components]
      A3[composables]
      A4[stores]
      A5[lib]
      A6[plugins]
      A7[assets/css]
    end

    subgraph Server[server - Backend Nitro]
      S1[api]
      S2[models]
      S3[services]
      S4[utils]
      S5[plugins]
    end

    subgraph Services[services - Esterno]
      P1[importer - Python FastAPI]
    end

    subgraph Docs[docs]
      D1[studente]
    end
  end

  A1 -. route .-> S1
  S2 -. schema .-> S3
  S4 -. proxy .-> P1

```

---

## 3. Modello Dati (Entity Relationship)

> [!IMPORTANT]
> Questo diagramma mostra **come sono collegate le entità** nel database MongoDB.

```mermaid
erDiagram
    PROJECT ||--o{ ESTIMATE : "has many"
    PROJECT ||--o{ OFFER : "has many"
    PROJECT ||--o{ WBS_NODE : "has many"
    PROJECT ||--o{ ESTIMATE_ITEM : "has many"
    PROJECT ||--o{ PRICE_LIST : "has one"
  
    ESTIMATE ||--o{ ESTIMATE_ITEM : "referenced by"
    ESTIMATE ||--o{ OFFER : "baseline for"
  
    OFFER ||--o{ OFFER_ITEM : "has many"
  
    PRICE_LIST ||--o{ PRICE_LIST_ITEM : "has many"
  
    WBS_NODE ||--o{ ESTIMATE_ITEM : "categorizes"
    WBS_NODE ||--o{ WBS_NODE : "parent of"
  
    PRICE_LIST_ITEM ||--o{ ESTIMATE_ITEM : "defines price"

    PROJECT {
        ObjectId id PK
        string name
        string code UK
        string description
        string status
        Date created_at
        Date updated_at
    }
  
    ESTIMATE {
        ObjectId id PK
        ObjectId project_id FK
        string name
        string type
        boolean is_baseline
        string company
        number round_number
        number total_amount
        Date created_at
    }
  
    OFFER {
        ObjectId id PK
        ObjectId project_id FK
        ObjectId estimate_id FK
        string name
        string company_name
        number round_number
        string mode
        string status
        number total_amount
    }
  
    WBS_NODE {
        ObjectId id PK
        ObjectId project_id FK
        ObjectId estimate_id FK
        ObjectId parent_id FK
        string type
        number level
        string code
        string description
        array ancestors
    }
  
    ESTIMATE_ITEM {
        ObjectId id PK
        ObjectId project_id FK
        array wbs_ids FK
        string price_list_item_id FK
        string code
        string description
        number progressive
        object project
        array offers
    }
  
    PRICE_LIST {
        ObjectId id PK
        ObjectId project_id FK
        string name
        string source
    }
  
    PRICE_LIST_ITEM {
        ObjectId id PK
        string price_list_id FK
        string code
        string description
        number unit_price
        string unit_measure
    }
  
    OFFER_ITEM {
        ObjectId id PK
        ObjectId offer_id FK
        ObjectId estimate_item_id FK
        number quantity
        number unit_price
        number amount
    }
```

---

## 4. Flusso Import SIX (da File a Database)

> [!IMPORTANT]
> Questo è il flusso più complesso: come un file `.six` diventa dati persistiti.

```mermaid
sequenceDiagram
    autonumber
    participant User as Utente
    participant UI as Import Page
    participant API as Nitro API
    participant Proxy as Python Proxy
    participant Python as Python Importer
    participant Service as ImportPersistenceService
    participant DB as MongoDB

    User->>UI: Upload file .six
    UI->>API: POST /api/projects/id/import-six multipart
  
    Note over API,Proxy: Il file viene inoltrato come multipart
    API->>Proxy: proxyToPython event
    Proxy->>Python: POST /parse-six file + config
  
    Note over Python: Parsing con xml.etree - Estrazione groups, estimate, price_list
    Python-->>Proxy: JSON response con project, groups, estimate, price_list
    Proxy-->>API: parsed result
  
    Note over API,Service: Persistenza orchestrata
    API->>Service: persistImportResult payload, projectId
  
    par Salvataggio parallelo
        Service->>DB: upsert Estimate baseline
        Service->>DB: upsert PriceList + Items
        Service->>DB: upsert WbsNodes groups
        Service->>DB: upsert EstimateItems
    end
  
    Service-->>API: estimate, stats
    API-->>UI: 200 OK + summary
    UI-->>User: Import completato!
```

---

## 5. Flusso Import Offerte Excel

> [!NOTE]
> Questo flusso gestisce l'import dei "ritorni" dalle imprese.

```mermaid
sequenceDiagram
    autonumber
    participant User as Utente
    participant Wizard as ImportWizard
    participant API as Nitro API
    participant Python as Python Importer
    participant Service as ImportPersistenceService
    participant DB as MongoDB

    User->>Wizard: Step 1 - Seleziona baseline
    User->>Wizard: Step 2 - Upload Excel + seleziona foglio
    User->>Wizard: Step 3 - Mapping colonne
    User->>Wizard: Step 4 - Conferma
  
    Wizard->>API: POST /api/projects/id/offers multipart + mapping
    API->>Python: POST /parse-returns file + config
  
    Note over Python: Parsing Excel con pandas - Mapping colonne
    Python-->>API: JSON items, metadata
  
    API->>Service: persistOffer payload, projectId
  
    Note over Service: Match items con baseline per progressive o codice
  
    par Salvataggio
        Service->>DB: upsert Offer
        Service->>DB: upsert OfferItems o EstimateItem.offers
    end
  
    Service-->>API: offer, matchingReport
    API-->>Wizard: 200 OK
    Wizard-->>User: Offerta importata!
```

---

## 6. Struttura WBS (Work Breakdown Structure)

> [!TIP]
> La WBS è gerarchica: da wbs01 (edificio) fino a wbs07 (voce di listino).

```mermaid
flowchart TB
    subgraph Spatial["WBS Spaziale - Dove"]
        wbs01["WBS01 Edificio/Opera"]
        wbs02["WBS02 Corpo"]
        wbs03["WBS03 Piano"]
        wbs04["WBS04 Zona"]
        wbs05["WBS05 Locale"]
    
        wbs01 --> wbs02
        wbs02 --> wbs03
        wbs03 --> wbs04
        wbs04 --> wbs05
    end
  
    subgraph Commodity["WBS Commodity - Cosa"]
        wbs06["WBS06 Categoria Lavoro"]
        wbs07["WBS07 Voce di Listino"]
    
        wbs06 --> wbs07
    end
  
    wbs05 -.->|contiene| wbs06
  
    subgraph Items["Voci Computo"]
        Item1["EstimateItem 1"]
        Item2["EstimateItem 2"]
        Item3["EstimateItem N"]
    end
  
    wbs07 --> Item1
    wbs07 --> Item2
    wbs07 --> Item3

    style Spatial fill:#e3f2fd
    style Commodity fill:#fff8e1
    style Items fill:#f3e5f5
```

### Esempio Concreto

```
WBS01: Scuola Elementare
├── WBS02: Corpo A
│   ├── WBS03: Piano Terra
│   │   ├── WBS04: Zona Servizi
│   │   │   ├── WBS05: Bagno Maschi
│   │   │   │   ├── WBS06: Impianto Idrico
│   │   │   │   │   ├── WBS07: Tubazioni
│   │   │   │   │   │   └── Item: Tubo rame 22mm (5 ml)
│   │   │   │   │   └── WBS07: Sanitari
│   │   │   │   │       └── Item: Lavabo (2 pz)
```

---

## 7. Flusso Pagina Frontend

> [!NOTE]
> Questo mostra il ciclo di vita tipico di una pagina con griglia.

```mermaid
flowchart TB
    subgraph PageLoad["Page Load"]
        Route["useRoute - legge params"]
        Context["useCurrentContext - carica progetto"]
        Fetch["useFetch - chiama API"]
    end
  
    subgraph DataLayer["Data Layer"]
        Composable["useDataGrid - configura colonne"]
        WBS["useWbsTree - costruisce albero"]
        Filters["useDataGridFilters - gestisce filtri"]
    end
  
    subgraph UI["UI Layer"]
        Layout["DataGridPage layout"]
        Sidebar["WbsSidebar filtro WBS"]
        Grid["AG Grid tabella dati"]
        Toolbar["DataGridToolbar search/export"]
    end
  
    Route --> Context
    Context --> Fetch
    Fetch --> Composable
  
    Composable --> Grid
    WBS --> Sidebar
    Filters --> Toolbar
  
    Layout --> Sidebar
    Layout --> Grid
    Layout --> Toolbar
  
    Sidebar -.->|filtra| Grid
    Toolbar -.->|cerca| Grid

    style PageLoad fill:#e3f2fd
    style DataLayer fill:#fff8e1
    style UI fill:#e8f5e9
```

---

## 8. API Endpoints (Mappa Visuale)

```mermaid
flowchart LR
    subgraph Projects["Projects /api/projects"]
        P1["GET / lista progetti"]
        P2["POST / crea progetto"]
        P3["GET /id dettaglio"]
        P4["PUT /id modifica"]
        P5["DELETE /id elimina"]
        P6["GET /id/context dashboard"]
    end
  
    subgraph Import["Import"]
        I1["POST /id/import-six import SIX raw"]
        I2["POST /id/import-six/preview preview"]
        I3["POST /id/offers import offerte"]
    end
  
    subgraph Estimates["Estimates"]
        E1["GET /id/estimates lista preventivi"]
        E2["GET /id/estimate/estimateId dettaglio"]
        E3["GET /id/estimate/estimateId/items voci"]
    end
  
    subgraph Offers["Offers"]
        O1["GET /id/offers lista offerte"]
        O2["GET /id/offers/offerId/items voci offerta"]
    end
  
    subgraph Analytics["Analytics"]
        A1["GET /id/analytics/summary statistiche"]
        A2["GET /id/analytics/comparison confronto"]
    end

    style Projects fill:#e3f2fd
    style Import fill:#ffebee
    style Estimates fill:#fff8e1
    style Offers fill:#f3e5f5
    style Analytics fill:#e8f5e9
```

---

## 9. Ciclo di Vita Dati (Da Import a Visualizzazione)

```mermaid
flowchart LR
    subgraph Input["Input"]
        SIX["File .six computo"]
        Excel["File .xlsx offerte"]
    end
  
    subgraph Parse["Parsing"]
        PythonSIX["Python SixParser"]
        PythonExcel["Python ReturnsParser"]
    end
  
    subgraph Persist["Persistenza"]
        Service["ImportPersistenceService"]
    end
  
    subgraph Store["MongoDB"]
        Project[("Project")]
        Estimate[("Estimate")]
        WBS[("WbsNode")]
        Items[("EstimateItem")]
        Offer[("Offer")]
        PL[("PriceList")]
    end
  
    subgraph Query["Query"]
        API["Nitro API"]
    end
  
    subgraph Display["Display"]
        Grid["AG Grid"]
        Charts["Analytics"]
        Compare["Comparison"]
    end
  
    SIX --> PythonSIX
    Excel --> PythonExcel
  
    PythonSIX --> Service
    PythonExcel --> Service
  
    Service --> Project
    Service --> Estimate
    Service --> WBS
    Service --> Items
    Service --> Offer
    Service --> PL
  
    Project --> API
    Estimate --> API
    Items --> API
  
    API --> Grid
    API --> Charts
    API --> Compare

    style Input fill:#ffebee
    style Parse fill:#fff8e1
    style Persist fill:#e8f5e9
    style Store fill:#e3f2fd
    style Query fill:#f3e5f5
    style Display fill:#fce4ec
```

---

## 10. Stack Tecnologico

```mermaid
mindmap
    root((Taboolo))
        Frontend
            Nuxt 4
                Vue 3
                Composition API
            UI
                Nuxt UI
                AG Grid
                Tailwind CSS
            State
                Pinia
                Composables
        Backend
            Nitro
                H3 handlers
                Server plugins
            Database
                MongoDB
                Mongoose ODM
            Integration
                Python Proxy
        Python_Service
            FastAPI
            Pandas
            XML parsing
        DevOps
            pnpm
            ESLint
            TypeScript
```

---

## Prossimi Passi

Ora che hai visto l'architettura:

1. **Approfondisci il modello dati** → `docs/studente/appendici/tecnico/03-modello-dati.md`
2. **Segui un flusso import** → `docs/studente/parte-c-dominio-feature/10-importer-python.md`
3. **Esplora le pagine** → `docs/studente/appendici/tecnico/09-frontend-pagine-componenti.md`

> [!TIP]
> Stampa questa pagina o tienila aperta: ti servirà come riferimento continuo mentre esplori il codice.
