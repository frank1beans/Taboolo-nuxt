export interface RawProject {
    id?: string;
    _id?: string;
    code: string;
    name: string;
    description?: string;
    businessUnit?: string;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface RawWbsNode {
    id: string;
    _id?: string;
    projectId: string; // or project_id if mapped
    code: string;
    description: string;
    level: number;
    type?: string; // kind
    parentId?: string;
    path?: string;
}

export interface RawPriceListItem {
    id: string;
    _id?: string;
    code: string;
    description: string;
    extraDescription?: string;
    long_description?: string;
    unit: string;
    price: number;
    groupIds?: string[];
    wbs_ids?: string[];
}

export interface RawPriceList {
    _id?: string; // mongo model
    projectId: string;
    name: string;
    items: RawPriceListItem[];
}

export interface RawMeasurementDetail {
    formula: string;
    value: number;
}

export interface RawEstimateItem {
    id: string; // _id
    _id?: string;
    progressive?: number;
    priceListItemId?: string;
    relatedItemId?: string; // vedi voce
    wbsIds?: string[];
    wbs_ids?: string[];
    quantity: number;
    measurements: RawMeasurementDetail[];
}

export interface RawEstimate {
    _id?: string;
    projectId: string;
    priceListId?: string;
    name: string;
    description?: string;
    items: RawEstimateItem[];
}

export interface RawImportPayload {
    project: RawProject;
    groups: RawWbsNode[];
    price_list: RawPriceList;
    estimate: RawEstimate;

    // Legacy / Preview fields
    preventivi?: any[];
    estimates?: any[];
    message?: string;
}
