export type EstimateType = "project" | "offer";

export type DisciplineEnum =
  | "general"
  | "architecture"
  | "structures"
  | "electrical_systems"
  | "mechanical_systems"
  | "plumbing_systems"
  | "special_systems"
  | "external_works"
  | "urbanization"
  | "other";

export interface ApiEstimate {
  id: number;
  name: string;
  type: EstimateType;
  discipline?: DisciplineEnum;
  revision?: string | null;
  is_baseline?: boolean;
  company?: string | null;
  round_number?: number | null;
  total_amount?: number | null;
  delta_vs_project?: number | null;
  delta_percentage?: number | null;
  notes?: string | null;
  file_name?: string | null;
  created_at: string;
  updated_at: string;
  matching_report?: Record<string, any> | null;
}

export type ProjectStatus = "setup" | "in_progress" | "closed";

export interface ApiProject {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  notes?: string | null;
  business_unit?: string | null;
  revision?: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface ApiProjectDetail extends ApiProject {
  estimates: ApiEstimate[];
}

export interface ApiWbsNode {
  level: number;
  code?: string | null;
  description?: string | null;
  amount: number;
  children: ApiWbsNode[];
}

export interface ApiWbsPathEntry {
  level: number;
  code?: string | null;
  description?: string | null;
}

export interface ApiAggregatedItem {
  progressive?: number | null;
  code?: string | null;
  description?: string | null;
  total_quantity: number;
  total_amount: number;
  unit_price?: number | null;
  unit_measure?: string | null;
  wbs_6_code?: string | null;
  wbs_6_description?: string | null;
  wbs_7_code?: string | null;
  wbs_7_description?: string | null;
  wbs_path?: ApiWbsPathEntry[];
}

export interface ApiEstimateWbsSummary {
  total_amount: number;
  tree: ApiWbsNode[];
  items: ApiAggregatedItem[];
}

export interface FrontendWbsNode {
  id: string;
  level: number;
  code?: string | null;
  description?: string | null;
  amount: number;
  children: FrontendWbsNode[];
  path: ApiWbsPathEntry[];
}

export interface ApiSpatialWbsNode {
  id: number;
  project_id: number;
  parent_id?: number | null;
  level: number;
  code: string;
  description?: string | null;
  total_amount?: number | null;
}

export interface ApiWbs6Node {
  id: number;
  project_id: number;
  spatial_wbs_id?: number | null;
  code: string;
  description: string;
  label: string;
}

export interface ApiWbs7Node {
  id: number;
  project_id: number;
  wbs6_id: number;
  code?: string | null;
  description?: string | null;
}

export interface ApiProjectWbs {
  project_id: number;
  spatial: ApiSpatialWbsNode[];
  wbs6: ApiWbs6Node[];
  wbs7: ApiWbs7Node[];
}

export interface ApiWbsImportStats {
  rows_total: number;
  spatial_inserted: number;
  spatial_updated: number;
  wbs6_inserted: number;
  wbs6_updated: number;
  wbs7_inserted: number;
  wbs7_updated: number;
}

export interface ApiWbsVisibilityEntry {
  level: number;
  node_id: number;
  code: string;
  description?: string | null;
  hidden: boolean;
}

export interface ApiSixImportReport {
  project_id: number;
  spatial_wbs: number;
  wbs6: number;
  wbs7: number;
  items: number;
  total_amount: number;
  price_items?: number | null;
  estimate_id?: string | null;
  catalog_only?: boolean;
}

export interface ApiSixEstimateOption {
  internal_id: string;
  code?: string | null;
  description?: string | null;
  author?: string | null;
  version?: string | null;
  date?: string | null;
  price_list_id?: string | null;
  price_list_label?: string | null;
  detections?: number | null;
  items?: number | null;
  total_amount?: number | null;
}

export interface ApiSixEstimatesPreview {
  estimates: ApiSixEstimateOption[];
}

export interface ApiSixInspectionPriceList {
  canonical_id: string;
  label: string;
  aliases: string[];
  priority: number;
  products: number;
  detections: number;
}

export interface ApiSixInspectionGroup {
  grp_id: string;
  code: string;
  description?: string | null;
  level?: number | null;
}

export interface ApiSixInspectionEstimate {
  internal_id: string;
  code?: string | null;
  description?: string | null;
  author?: string | null;
  version?: string | null;
  date?: string | null;
  price_list_id?: string | null;
  detections: number;
  items: number;
}

export interface ApiSixInspection {
  estimates: ApiSixInspectionEstimate[];
  price_lists: ApiSixInspectionPriceList[];
  spatial_wbs: ApiSixInspectionGroup[];
  wbs6: ApiSixInspectionGroup[];
  wbs7: ApiSixInspectionGroup[];
  products_total: number;
}

export interface ApiNlpModelOption {
  id: string;
  label: string;
  description: string;
  dimension: number;
  languages: string;
  speed: string;
}

export interface ApiSettings {
  id: number;
  critical_min_delta: number;
  critical_max_delta: number;
  high_cme_percentage: number;
  low_cme_percentage: number;
  nlp_model_id: string;
  nlp_batch_size: number;
  nlp_max_length: number;
  nlp_embeddings_model_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiSettingsResponse {
  settings: ApiSettings;
  nlp_models: ApiNlpModelOption[];
  nlp_embeddings_outdated: boolean;
}

export interface PropertySchemaField {
  id: string;
  title?: string | null;
  type?: string | null;
  unit?: string | null;
  enum?: string[] | null;
}

export interface PropertyCategorySchema {
  id: string;
  name?: string | null;
  required: string[];
  properties: PropertySchemaField[];
}

export interface PropertySchemaResponse {
  categories: PropertyCategorySchema[];
}

export interface PropertyExtractionPayload {
  text: string;
  category_id: string;
  wbs6_code?: string | null;
  wbs6_description?: string | null;
  properties?: string[];
  engine?: "llm" | "rules";
}

export interface PropertyExtractionResult {
  category_id: string;
  properties: Record<string, any>;
  missing_required: string[];
}

export interface ApiImportConfigCreate {
  name: string;
  company?: string | null;
  sheet_name?: string | null;
  code_columns?: string | null;
  description_columns?: string | null;
  price_column?: string | null;
  quantity_column?: string | null;
  notes?: string | null;
}

export interface ApiImportConfig extends ApiImportConfigCreate {
  id: number;
  project_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ApiBatchSingleFileFailure {
  company: string;
  error: string;
  error_type?: string | null;
  details?: string | null;
  config?: Record<string, any> | null;
}

export interface ApiBatchSingleFileResult {
  success: string[];
  failed: ApiBatchSingleFileFailure[];
  total: number;
  success_count: number;
  failed_count: number;
  estimates: Record<string, ApiEstimate>;
}

export interface ApiProjectPreferencesCreate {
  selected_estimate_id?: string | null;
  selected_price_list_id?: string | null;
  default_wbs_view?: string | null;
  custom_settings?: Record<string, unknown> | null;
}

export interface ApiProjectPreferences extends ApiProjectPreferencesCreate {
  id: number;
  project_id: number;
  created_at: string;
  updated_at: string;
}

export interface ApiDashboardActivity {
  estimate_id: number;
  estimate_name: string;
  type: EstimateType;
  project_id: number;
  project_code: string;
  project_name: string;
  created_at: string;
}

export interface ApiDashboardStats {
  active_projects: number;
  loaded_estimates: number;
  offers: number;
  generated_reports: number;
  recent_activity: ApiDashboardActivity[];
}

export interface ApiComparisonItemOffer {
  quantity?: number | null;
  unit_price?: number | null;
  total_amount?: number | null;
  notes?: string | null;
  criticality?: string | null;
  quantity_delta?: number | null;
}

export interface ApiComparisonItem {
  progressive?: number | null;
  code?: string | null;
  description?: string | null;
  extended_description?: string | null;
  unit_measure?: string | null;
  quantity?: number | null;
  project_unit_price?: number | null;
  project_total_amount?: number | null;
  offers: Record<string, ApiComparisonItemOffer>;
  wbs6_code?: string | null;
  wbs6_description?: string | null;
  wbs7_code?: string | null;
  wbs7_description?: string | null;
}

export interface ApiComparisonCompany {
  name: string;
  estimate_id: number;
  company?: string | null;
  round_number?: number | null;
  label?: string | null;
  round_label?: string | null;
}

export interface ApiComparisonRound {
  number: number;
  label: string;
  companies: string[];
  companies_count: number;
}

export interface ApiOffersComparison {
  items: ApiComparisonItem[];
  companies: ApiComparisonCompany[];
  rounds: ApiComparisonRound[];
}

export interface ApiAnalysisAmountComparison {
  name: string;
  type: EstimateType;
  amount: number;
  delta_percentage?: number | null;
  company?: string | null;
  round_number?: number | null;
}

export interface ApiAnalysisDistributionItem {
  name: string;
  value: number;
  color: string;
}

export interface ApiAnalysisCriticalItem {
  code?: string | null;
  description?: string | null;
  extended_description?: string | null;
  project: number;
  companies: Record<string, number>;
  delta: number;
  criticality: string;
  absolute_delta: number;
  average_unit_price?: number | null;
  average_total_amount?: number | null;
  min_offer?: number | null;
  max_offer?: number | null;
  company_min?: string | null;
  company_max?: string | null;
  standard_deviation?: number | null;
  direction: string;
}

export interface ApiAnalysisWbs6Criticality {
  high: number;
  medium: number;
  low: number;
}

export interface ApiAnalysisWbs6Item {
  code?: string | null;
  description?: string | null;
  extended_description?: string | null;
  unit_measure?: string | null;
  quantity?: number | null;
  project_unit_price?: number | null;
  project_total_amount?: number | null;
  average_unit_price?: number | null;
  average_total_amount?: number | null;
  delta_percentage?: number | null;
  absolute_delta?: number | null;
  considered_offers: number;
  min_amount?: number | null;
  max_amount?: number | null;
  company_min?: string | null;
  company_max?: string | null;
  standard_deviation?: number | null;
  criticality?: string | null;
  direction?: string;
}

export interface ApiAnalysisWbs6Trend {
  wbs6_id: string;
  wbs6_label: string;
  wbs6_code?: string | null;
  wbs6_description?: string | null;
  project: number;
  average_offers: number;
  delta_percentage: number;
  absolute_delta: number;
  criticality_counts: ApiAnalysisWbs6Criticality;
  considered_offers: number;
  total_offers: number;
  items: ApiAnalysisWbs6Item[];
}

export interface ApiAnalysisRound {
  number: number;
  label: string;
  companies: string[];
  companies_count: number;
}

export interface ApiAnalysisCompany {
  estimate_id: number;
  name: string;
  company?: string | null;
  label?: string | null;
  round_number?: number | null;
  round_label?: string | null;
}

export interface ApiAnalysisFilters {
  round_number?: number | null;
  company?: string | null;
  normalized_company?: string | null;
  total_offers: number;
  considered_offers: number;
  active_companies: string[];
}

export interface ApiAnalysisThresholds {
  media_percent: number;
  alta_percent: number;
}

export interface ApiProjectAnalysis {
  amounts_comparison: ApiAnalysisAmountComparison[];
  variations_distribution: ApiAnalysisDistributionItem[];
  critical_items: ApiAnalysisCriticalItem[];
  wbs6_analysis: ApiAnalysisWbs6Trend[];
  rounds: ApiAnalysisRound[];
  companies: ApiAnalysisCompany[];
  filters: ApiAnalysisFilters;
  thresholds: ApiAnalysisThresholds;
}

// Trend Evolution Round
export interface ApiTrendEvolutionOffer {
  round: number;
  round_label?: string | null;
  amount: number;
  delta?: number | null;
}

export interface ApiTrendEvolutionCompany {
  company: string;
  color: string;
  offers: ApiTrendEvolutionOffer[];
  overall_delta?: number | null;
}

export interface ApiTrendEvolution {
  companies: ApiTrendEvolutionCompany[];
  rounds: ApiAnalysisRound[];
  filters: ApiAnalysisFilters;
}

// Heatmap competitiveness
export interface ApiHeatmapCategory {
  category: string;
  project_amount: number;
}

export interface ApiHeatmapCompanyCategory {
  category: string;
  offer_amount: number;
  delta: number;
}

export interface ApiHeatmapCompany {
  company: string;
  categories: ApiHeatmapCompanyCategory[];
}

export interface ApiHeatmapCompetitiveness {
  categories: ApiHeatmapCategory[];
  companies: ApiHeatmapCompany[];
  filters: ApiAnalysisFilters;
}

export interface ApiPriceListOffer {
  id: number;
  price_list_item_id: number;
  estimate_id: number;
  company_id?: number | null;
  company_label?: string | null;
  round_number?: number | null;
  unit_price: number;
  quantity?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ApiPriceListItem {
  id: number;
  project_id: number;
  project_name: string;
  project_code: string;
  business_unit?: string | null;
  product_id: string;
  item_code: string;
  item_description?: string | null;
  unit_id?: string | null;
  unit_label?: string | null;
  wbs6_code?: string | null;
  wbs6_description?: string | null;
  wbs7_code?: string | null;
  wbs7_description?: string | null;
  price_lists?: Record<string, number> | null;
  extra_metadata?: Record<string, any> | null;
  source_file?: string | null;
  estimate_id?: string | null;
  project_price?: number | null;
  project_quantity?: number | null;
  offer_prices?: Record<
    string,
    {
      price: number | null;
      quantity?: number | null;
      round_number?: number | null;
      estimate_id?: number | null;
    }
  > | null;
  offers?: ApiPriceListOffer[];
  created_at: string;
  updated_at: string;
}

export interface ApiManualPriceUpdateResponse {
  offer: ApiPriceListOffer;
  estimate: ApiEstimate;
}

export interface ApiPriceListItemSearchResult extends ApiPriceListItem {
  score: number;
  match_reason?: string | null;
}

export interface ApiPriceCatalogProjectSummary {
  project_id: number;
  project_name: string;
  project_code: string;
  business_unit?: string | null;
  items_count: number;
  last_updated?: string | null;
}

export interface ApiPriceCatalogBusinessUnitSummary {
  label: string;
  value?: string | null;
  items_count: number;
  projects: ApiPriceCatalogProjectSummary[];
}

export interface ApiPriceCatalogSummary {
  total_items: number;
  total_projects: number;
  business_units: ApiPriceCatalogBusinessUnitSummary[];
}

export type ApiUserRole = "admin" | "manager" | "user";

export interface ApiUser {
  id: number;
  email: string;
  full_name?: string | null;
  role: ApiUserRole;
  is_active: boolean;
  created_at: string;
}

export interface ApiUserProfile {
  id: number;
  user_id: number;
  company?: string | null;
  language?: string | null;
  settings?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface ApiAuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: ApiUser;
}
