export interface WbsNode {
  id: string;
  project_id?: string;
  parent_id?: string;
  type?: 'spatial' | 'commodity';
  level: number; // 1-7
  category?: string;
  code: string;
  description?: string;
  children?: WbsNode[];
  expanded?: boolean;
  ancestors?: string[];
  wbs_spatial_id?: string;
  wbs6_id?: string;
  project_amount?: number;
  created_at?: Date;
  updated_at?: Date;
  name?: string; // UI alias for description
  count?: number; // UI aggregation
  amount?: number; // UI aggregation
}

export interface WbsFilterConfig {
  field: string; // Campo della tabella da filtrare
  wbsLevel: number; // Livello WBS che triggera questo filtro
  extractValue: (node: WbsNode) => string; // Funzione per estrarre valore da filtrare
}

export interface WbsTreeState {
  nodes: WbsNode[];
  loading: boolean;
  selectedNode: WbsNode | null;
  expandedNodes: Set<string>;
}
