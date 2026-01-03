import type { ApiEstimate, ApiOfferSummary } from './api';

export const QueryKeys = {
    // Global Catalog
    CATALOG_ROWS_PAGED: 'catalog.rows.paged',
    CATALOG_WBS_SUMMARY: 'catalog.wbs.summary',
    CATALOG_SUMMARY: 'catalog.summary',
    CATALOG_SEMANTIC_SEARCH: 'catalog.semantic.search',

    // Project & Estimate Dashboard
    PROJECT_LIST: 'project.list',
    PROJECT_GET: 'project.get',
    PROJECT_ESTIMATES: 'project.estimates',
    PROJECT_OFFERS: 'project.offers',
    PROJECT_STATS: 'project.stats',

    // Estimate
    ESTIMATE_TREE: 'estimate.tree',
    ESTIMATE_DETAILS: 'estimate.details',
} as const;

export type QueryId = (typeof QueryKeys)[keyof typeof QueryKeys];

// Placeholder document interfaces - to be replaced or imported from actual models
export interface CatalogRow {
    _id: string; // or ObjectId
    code: string;
    description: string;
    long_description?: string;
    extended_description?: string;
    unit?: string;
    price?: number;
    wbs6_code?: string;
    wbs6_description?: string;
    wbs7_code?: string;
    wbs7_description?: string;
    project_id?: string;
    project_name?: string;
    project_code?: string;
    business_unit?: string;
}

export interface WbsSummaryItem {
    wbs6_code: string;
    wbs6_description: string;
    wbs7_code: string;
    wbs7_description: string;
    count?: number;
}

export interface CatalogSummary {
    total_items: number;
    total_projects: number;
    business_units: string[];
}

export interface SemanticSearchResult extends CatalogRow {
    score: number;
}

// Phase 2 Types
export interface ProjectListItem {
    id: string;
    name: string;
    code: string;
    business_unit?: string;
    status: string;
    updated_at: string;
    estimates_count: number;
    offers_count: number;
}

export interface ProjectDetails {
    id: string;
    name: string;
    code: string;
    description?: string;
    business_unit?: string;
    status: string;
    created_at: string;
    updated_at: string;
}

export interface EstimateListItem {
    id: string;
    project_id: string;
    name: string;
    type: 'project' | 'offer';
    status?: string;
    total_amount?: number;
    is_baseline: boolean;
    company?: string;
    created_at: string;
}

export interface WbsNodeTree {
    id: string;
    label: string;
    code: string;
    level: number;
    children?: WbsNodeTree[];
    data?: any;
}


export interface QueryArgsMap {
    [QueryKeys.CATALOG_ROWS_PAGED]: {
        page?: number;
        limit?: number;
        search?: string;
        wbs6?: string[];
        wbs7?: string[];
        project_id?: string;
        business_unit?: string[];
        sort?: string;
    };
    [QueryKeys.CATALOG_WBS_SUMMARY]: {
        project_id?: string;
        search?: string;
    };
    [QueryKeys.CATALOG_SUMMARY]: Record<string, never>; // No args
    [QueryKeys.CATALOG_SEMANTIC_SEARCH]: {
        query: string;
        limit?: number;
        threshold?: number;
    };

    // Phase 2 Query Args
    [QueryKeys.PROJECT_LIST]: {
        search?: string;
        status?: string[];
        sort?: string;
    };
    [QueryKeys.PROJECT_GET]: { id: string };
    [QueryKeys.PROJECT_ESTIMATES]: { project_id: string; type?: 'project' | 'offer' }; // Should default to project (baseline)
    [QueryKeys.PROJECT_OFFERS]: { project_id: string; estimate_id?: string }; // Offers for project (optionally filtered by baseline)
    [QueryKeys.PROJECT_STATS]: { id: string };

    [QueryKeys.ESTIMATE_TREE]: { estimate_id: string }; // or project_id if baseline?
    [QueryKeys.ESTIMATE_DETAILS]: { id: string };
}

export interface QueryResultMap {
    [QueryKeys.CATALOG_ROWS_PAGED]: {
        items: CatalogRow[];
        total: number;
        page: number;
        limit: number;
    };
    [QueryKeys.CATALOG_WBS_SUMMARY]: {
        items: WbsSummaryItem[];
    };
    [QueryKeys.CATALOG_SUMMARY]: CatalogSummary;
    [QueryKeys.CATALOG_SEMANTIC_SEARCH]: {
        items: SemanticSearchResult[];
    };

    // Phase 2 Query Results
    [QueryKeys.PROJECT_LIST]: {
        items: ProjectListItem[];
        total: number;
    };
    [QueryKeys.PROJECT_GET]: ProjectDetails;
    [QueryKeys.PROJECT_ESTIMATES]: {
        items: EstimateListItem[];
    };
    [QueryKeys.PROJECT_OFFERS]: {
        items: ApiOfferSummary[];
    };
    [QueryKeys.PROJECT_STATS]: {
        total_estimates: number;
        total_offers: number;
        baseline_amount: number;
    };
    [QueryKeys.ESTIMATE_TREE]: {
        root: WbsNodeTree[];
    };
    [QueryKeys.ESTIMATE_DETAILS]: ApiEstimate;
}
