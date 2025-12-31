export type IsoDateString = string;

export interface Project {
    id: string;
    name: string;
    code: string;
    description?: string;
    notes?: string;
    business_unit?: string;
    revision?: string;
    status: 'setup' | 'in_progress' | 'closed';
    created_at: IsoDateString;
    updated_at: IsoDateString;
    estimates?: Estimate[];
}

export interface PriceCatalog {
    id: string;
    name?: string;
}

export interface Round {
    id: string;
    name?: string;
    companies?: Company[];
}

export interface Company {
    id: string;
    name?: string;
    offerMode?: 'detailed' | 'aggregated';
    offerId?: string;
}

export interface Estimate {
    id: string;
    project_id: string;
    name: string;
    type: 'project' | 'offer';
    discipline?: string;
    revision?: string;
    is_baseline: boolean;
    company?: string;
    round_number?: number;
    total_amount?: number;
    delta_vs_project?: number;
    delta_percentage?: number;
    notes?: string;
    file_name?: string;
    delivery_date?: IsoDateString;
    price_list_id?: string;
    source_preventivo_id?: string;
    import_run_id?: string;
    matching_report?: Record<string, unknown>;
    created_at: IsoDateString;
    updated_at: IsoDateString;

    // Enriched fields
    priceCatalog?: PriceCatalog;
    rounds?: Round[];
    companies?: Company[];
    roundsCount?: number;
    companiesCount?: number;
}

export interface Offer extends Estimate {
    type: 'offer';
    status?: 'draft' | 'submitted' | 'accepted' | 'rejected';
    mode?: 'detailed' | 'aggregated';
    date?: IsoDateString;
}

export interface PriceList {
    id: string;
    project_id?: string;
    estimate_id?: string;
    name: string;
    currency: string;
    description?: string;
    is_default: boolean;
    import_run_id?: string;
    created_at: IsoDateString;
    updated_at: IsoDateString;
}

export interface WbsNode {
    id: string;
    project_id: string;
    estimate_id: string;
    parent_id?: string;
    type: 'spatial' | 'commodity';
    level: number;
    category?: string;
    code: string;
    description?: string;
    wbs_spatial_id?: string;
    wbs6_id?: string;
    ancestors: string[];
    project_amount?: number;
    created_at: IsoDateString;
    updated_at: IsoDateString;

    // Frontend properties
    children?: WbsNode[];
    expanded?: boolean;
}

// Interfaces relating to Import Process
export interface PythonImportResult {
    project?: Partial<Project>;
    groups: Array<{
        id: string;
        parentId?: string;
        code: string;
        description: string;
        level: number;
    }>;
    price_list: {
        name: string;
        items: Array<{
            id: string;
            code: string;
            description: string;
            long_description?: string;
            price: number;
            unit: string;
            wbsIds: string[];
            embedding?: number[];
        }>
    };
    estimate: {
        name: string;
        is_baseline: boolean;
        items: Array<{
            priceListItemId: string;
            quantity: number;
            measurements: Record<string, unknown>[];
            wbsIds: string[];
        }>
    };
}
