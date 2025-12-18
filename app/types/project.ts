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
    // Offer Metadata for Navigation
    offerMode?: 'detailed' | 'aggregated';
    offerId?: string;
}

export interface Estimate {
    id: string;
    name: string;
    priceCatalog?: PriceCatalog;
    rounds?: Round[];
    companies?: Company[];
    roundsCount?: number;
    companiesCount?: number;
    totalAmount?: number;
    price_list_id?: string;
    created_at?: Date;
    updated_at?: Date;
}

export interface Project {
    id: string;
    name: string;
    code: string;
    description?: string;
    notes?: string;
    business_unit?: string;
    revision?: string;
    status: 'setup' | 'in_progress' | 'closed';
    created_at: Date;
    updated_at: Date;
    estimates?: Estimate[];
}
