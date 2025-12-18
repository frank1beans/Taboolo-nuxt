/**
 * Shared contract types for cross-layer payloads (Python importer -> Nitro -> Frontend).
 * Keep naming consistent across services.
 */

export interface WbsNodeContract {
  id?: string;
  _id?: string;
  project_id: string;
  estimate_id: string;
  level: number;
  type: 'spatial' | 'commodity';
  code: string;
  description?: string;
  parent_id?: string | null;
  ancestors?: string[];
}

export interface PriceListContract {
  id?: string;
  _id?: string;
  project_id: string;
  estimate_id: string;
  name: string;
  currency?: string;
  is_default?: boolean;
}

export interface PriceListItemContract {
  id?: string;
  _id?: string;
  project_id: string;
  estimate_id: string;
  price_list_id: string;
  code: string;
  short_description?: string;
  long_description?: string;
  unit?: string;
  price?: number;
  wbs_ids?: string[];
}

export interface EstimateItemContract {
  id?: string;
  _id?: string;
  project_id: string;
  estimate_id: string;
  price_list_item_id: string;
  wbs_ids?: string[];
  progressive?: number;
  code?: string;
  short_description?: string;
  long_description?: string;
  unit?: string;
  quantity?: number;
  unit_price?: number;
  amount?: number;
}
