export type { ApiProject } from "@/types/api";

import type {
  ApiProjectAnalysis,
  ApiAnalysisWbs6Trend,
  ApiAuthResponse,
  ApiProject,
  ApiProjectDetail,
  ApiProjectPreferences,
  ApiProjectPreferencesCreate,
  ApiProjectWbs,
  ApiEstimate,
  ApiEstimateWbsSummary,
  ApiOffersComparison,
  ApiDashboardStats,
  ApiHeatmapCompetitiveness,
  ApiManualPriceUpdateResponse,
  ApiImportConfig,
  ApiImportConfigCreate,
  ApiBatchSingleFileResult,
  ApiPriceCatalogSummary,
  ApiPriceListItem,
  ApiPriceListItemSearchResult,
  ApiSettings,
  ApiSettingsResponse,
  ApiSixImportReport,
  ApiSixEstimatesPreview,
  ApiTrendEvolution,
  ApiUser,
  ApiUserProfile,
  ApiWbsImportStats,
  ApiWbsVisibilityEntry,
  ProjectStatus,
  PropertySchemaResponse,
  PropertyExtractionPayload,
  PropertyExtractionResult,
} from "@/types/api";
import { useRuntimeConfig } from "#app";
import { getAccessToken } from "./auth-storage";
import { toast } from "vue-sonner";

const API_BASE_URL =
  process.env.NUXT_PUBLIC_API_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "/api";

const propertySchemasStaticOnly =
  (import.meta.env.VITE_PROPERTY_SCHEMAS_STATIC as string | undefined)?.toLowerCase() === "true" ||
  (import.meta.env.VITE_PROPERTY_SCHEMAS_STATIC as string | undefined) === "1";

let propertySchemasFallbackPreferred = false;
const propertyExtractionStaticOnly =
  (import.meta.env.VITE_PROPERTY_EXTRACTION_STATIC as string | undefined)?.toLowerCase() === "true" ||
  (import.meta.env.VITE_PROPERTY_EXTRACTION_STATIC as string | undefined) === "1";
const propertyExtractionNoFallback =
  (import.meta.env.VITE_PROPERTY_EXTRACTION_NO_FALLBACK as string | undefined)?.toLowerCase() === "true" ||
  (import.meta.env.VITE_PROPERTY_EXTRACTION_NO_FALLBACK as string | undefined) === "1";
let propertyExtractionFallbackPreferred = false;

const apiBaseNoTrailing = API_BASE_URL.replace(/\/+$/, "");
const apiBaseWithoutPrefix = apiBaseNoTrailing.replace(/\/api\/v1$/, "");

const fetchPropertySchemasStatic = async (): Promise<PropertySchemaResponse> => {
  const base = import.meta.env.BASE_URL || "/";
  const fallbackUrl = base.endsWith("/") ? `${base}property-schemas.json` : `${base}/property-schemas.json`;
  const response = await fetch(fallbackUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Unable to load property schemas from static asset (${response.status})`);
  }
  return (await response.json()) as PropertySchemaResponse;
};

const buildExtractionFallback = (payload: PropertyExtractionPayload): PropertyExtractionResult => ({
  category_id: payload.category_id,
  properties: {},
  missing_required: [],
});

const authHeaders = () => {
  const token = getAccessToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const tryExtractAtUrl = async (url: string, payload: PropertyExtractionPayload) => {
  const response = await fetch(url, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return (await response.json()) as PropertyExtractionResult;
};

const getApiBaseUrl = () => {
  const config = useRuntimeConfig();
  const fromRuntime = config?.public?.pythonApiBaseUrl || config?.pythonApiBaseUrl;
  const base = (fromRuntime as string | undefined) || API_BASE_URL;
  return base.replace(/\/+$/, "");
};

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const base = getApiBaseUrl();
  const response = await fetch(`${base}${path}`, {
    cache: options?.cache ?? "no-store",
    headers: {
      ...(options?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    const contentType = response.headers.get("content-type") ?? "";

    // Handle 401 Unauthorized - redirect to login
    if (response.status === 401) {
      toast.error("Session expired. Please sign in again.");
      // Small delay to show toast before redirect
      if (typeof window !== "undefined") {
        setTimeout(() => {
          window.location.href = "/login";
        }, 100);
      }
      throw new Error("Unauthorized");
    }

    if (contentType.includes("application/json")) {
      try {
        const payload: unknown = await response.json();
        if (typeof payload === "string") {
          message = payload;
        } else if (payload && typeof payload === "object") {
          const data = payload as Record<string, unknown>;
          if (Array.isArray(data.detail)) {
            message = data.detail
              .map((item) => {
                if (typeof item === "string") return item;
                if (item && typeof item === "object" && "msg" in item) {
                  return String((item as Record<string, unknown>).msg);
                }
                return JSON.stringify(item);
              })
              .join("\n");
          } else if (data.detail) {
            if (
              typeof data.detail === "object" &&
              data.detail !== null &&
              "message" in data.detail
            ) {
              message = String(
                (data.detail as Record<string, unknown>).message ?? "Invalid request",
              );
            } else {
              message = String(data.detail);
            }
          } else if (data.message) {
            message = String(data.message);
          }
        }
      } catch {
        const fallback = await response.text();
        if (fallback) message = fallback;
      }
    } else {
      const text = await response.text();
      if (text) message = text;
    }

    // Show toast notification for 4xx/5xx errors (except 401 which was already handled)
    if (response.status >= 400) {
      toast.error(message || "An error occurred while processing the request");
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const expectsJson = response.headers.get("content-type")?.includes("application/json");
  if (!expectsJson) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  async listProjects(): Promise<ApiProject[]> {
    return apiFetch<ApiProject[]>("/projects");
  },

  async getProject(id: number | string): Promise<ApiProjectDetail> {
    return apiFetch<ApiProjectDetail>(`/projects/${id}`);
  },

  async exportProjectBundle(
    projectId: number | string,
  ): Promise<{ blob: Blob; filename: string }> {
    const token = getAccessToken();
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/bundle`, {
      method: "GET",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      let message = `Request failed with status ${response.status}`;
      const contentType = response.headers.get("content-type") ?? "";

      // Handle 401 Unauthorized - redirect to login
      if (response.status === 401) {
        toast.error("Session expired. Please sign in again.");
        if (typeof window !== "undefined") {
          setTimeout(() => {
            window.location.href = "/login";
          }, 100);
        }
        throw new Error("Unauthorized");
      }

      if (contentType.includes("application/json")) {
        try {
          const payload: unknown = await response.json();
          if (payload && typeof payload === "object") {
            const data = payload as Record<string, unknown>;
            if (Array.isArray(data.detail)) {
              message = data.detail
                .map((item) => {
                  if (typeof item === "string") return item;
                  if (item && typeof item === "object" && "msg" in item) {
                    return String((item as Record<string, unknown>).msg);
                  }
                  return JSON.stringify(item);
                })
                .join("\n");
            } else if (data.detail) {
              if (
                typeof data.detail === "object" &&
                data.detail !== null &&
                "message" in data.detail
              ) {
                message = String(
                  (data.detail as Record<string, unknown>).message ?? "Invalid request",
                );
              } else {
                message = String(data.detail);
              }
            } else if (data.message) {
              message = String(data.message);
            }
          }
        } catch {
          const fallback = await response.text();
          if (fallback) message = fallback;
        }
      } else {
        const text = await response.text();
        if (text) message = text;
      }

      // Show toast notification for errors
      if (response.status >= 400) {
        toast.error(message || "An error occurred while processing the request");
      }

      throw new Error(message);
    }

    const contentDisposition = response.headers.get("content-disposition") ?? "";
    const filenameMatch = contentDisposition.match(/filename\*?=([^;]+)/i);
    const filename = filenameMatch
      ? decodeURIComponent(filenameMatch[1].replace(/^"|"$/g, "").replace("UTF-8''", ""))
      : `project-${projectId}.mmcomm`;

    const blob = await response.blob();
    return { blob, filename };
  },

  async createProject(payload: {
    name: string;
    code: string;
    description?: string | null;
    notes?: string | null;
    business_unit?: string | null;
    revision?: string | null;
    status?: ProjectStatus;
  }): Promise<ApiProject> {
    return apiFetch<ApiProject>("/projects", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async importProjectBundle(
    file: File,
    options?: { overwrite?: boolean },
  ): Promise<ApiProject> {
    const formData = new FormData();
    formData.append("file", file);
    const params = new URLSearchParams();
    if (options?.overwrite) {
      params.set("overwrite", "true");
    }
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return apiFetch<ApiProject>(`/projects/import-bundle${suffix}`, {
      method: "POST",
      body: formData,
    });
  },

  async updateProject(
    projectId: number | string,
    payload: {
      name: string;
      code: string;
      description?: string | null;
      notes?: string | null;
      business_unit?: string | null;
      revision?: string | null;
      status?: ProjectStatus;
    }
  ): Promise<ApiProject> {
    return apiFetch<ApiProject>(`/projects/${projectId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async getProjectPreferences(projectId: number | string): Promise<ApiProjectPreferences> {
    return apiFetch<ApiProjectPreferences>(`/projects/${projectId}/preferences`);
  },

  async updateProjectPreferences(
    projectId: number | string,
    payload: ApiProjectPreferencesCreate
  ): Promise<ApiProjectPreferences> {
    return apiFetch<ApiProjectPreferences>(`/projects/${projectId}/preferences`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async getProjectWbsStructure(
    projectId: number | string,
  ): Promise<ApiProjectWbs> {
    return apiFetch<ApiProjectWbs>(`/projects/${projectId}/wbs`);
  },

  async uploadProjectWbs(
    projectId: number | string,
    file: File,
    mode: "create" | "update" = "create",
  ): Promise<ApiWbsImportStats> {
    const formData = new FormData();
    formData.append("file", file);
    const method = mode === "create" ? "POST" : "PUT";
    return apiFetch<ApiWbsImportStats>(`/projects/${projectId}/wbs/upload`, {
      method,
      body: formData,
    });
  },

  async getWbsVisibility(
    projectId: number | string,
  ): Promise<ApiWbsVisibilityEntry[]> {
    return apiFetch<ApiWbsVisibilityEntry[]>(
      `/projects/${projectId}/wbs/visibility`,
    );
  },

  async updateWbsVisibility(
    projectId: number | string,
    payload: { level: number; node_id: number; hidden: boolean }[],
  ): Promise<ApiWbsVisibilityEntry[]> {
    return apiFetch<ApiWbsVisibilityEntry[]>(
      `/projects/${projectId}/wbs/visibility`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );
  },


  async deleteProject(projectId: number | string): Promise<void> {
    return apiFetch<void>(`/projects/${projectId}`, {
      method: "DELETE",
    });
  },

  async uploadProjectEstimate(
    projectId: number | string,
    file: File,
    options?: {
      discipline?: string;
      revision?: string;
      isBaseline?: boolean;
    },
  ): Promise<ApiEstimate> {
    const formData = new FormData();
    formData.append("file", file);
    if (options?.discipline) {
      formData.append("discipline", options.discipline);
    }
    if (options?.revision) {
      formData.append("revision", options.revision);
    }
    if (options?.isBaseline !== undefined) {
      formData.append("is_baseline", String(options.isBaseline));
    }
    return apiFetch<ApiEstimate>(`/projects/${projectId}/project-estimate`, {
      method: "POST",
      body: formData,
    });
  },

  async previewSixEstimates(
    projectId: number | string,
    file: File,
  ): Promise<ApiSixEstimatesPreview> {
    const formData = new FormData();
    formData.append("file", file);
    return apiFetch<ApiSixEstimatesPreview>(
      `/projects/${projectId}/import-six/preview`,
      {
        method: "POST",
        body: formData,
      },
    );
  },

  async importSixFile(
    projectId: number | string,
    file: File,
    estimateId?: string | null,
    options?: {
      enableEmbeddings?: boolean;
      enablePropertyExtraction?: boolean;
    },
  ): Promise<ApiSixImportReport> {
    const formData = new FormData();
    formData.append("file", file);
    if (estimateId) {
      formData.append("estimate_id", estimateId);
    }
    if (options?.enableEmbeddings) {
      formData.append("compute_embeddings", "true");
    }
    if (options?.enablePropertyExtraction) {
      formData.append("extract_properties", "true");
    }
    return apiFetch<ApiSixImportReport>(`/projects/${projectId}/import-six`, {
      method: "POST",
      body: formData,
    });
  },

  async uploadBidOffer(
    projectId: number | string,
    params: {
      file: File;
      company: string;
      mode?: "mc" | "lc";
      roundMode: "auto" | "new" | "replace";
      roundNumber?: number | null;
      discipline?: string;
      sheetName: string;
      codeColumns: string[];
      descriptionColumns: string[];
      priceColumn?: string;
      quantityColumn?: string;
      progressColumn?: string;
    },
  ): Promise<ApiEstimate> {
    const {
      file,
      company,
      roundMode,
      roundNumber,
      discipline,
      sheetName,
      codeColumns,
      descriptionColumns,
      priceColumn,
      quantityColumn,
      progressColumn,
    } = params;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("company", company);
    formData.append("round_mode", roundMode);
    if (roundNumber !== undefined && roundNumber !== null) {
      formData.append("round_number", String(roundNumber));
    }
    if (discipline) {
      formData.append("discipline", discipline);
    }
    formData.append("sheet_name", sheetName);
    if (codeColumns?.length) {
      formData.append("code_columns", JSON.stringify(codeColumns));
    }
    if (descriptionColumns?.length) {
      formData.append("description_columns", JSON.stringify(descriptionColumns));
    }
    if (params.mode) {
      formData.append("mode", params.mode);
    }
    if (priceColumn) {
      formData.append("price_column", priceColumn);
    }
    if (quantityColumn) {
      formData.append("quantity_column", quantityColumn);
    }
    if (progressColumn) {
      formData.append("progressive_column", progressColumn);
    }
    return apiFetch<ApiEstimate>(`/projects/${projectId}/offers`, {
      method: "POST",
      body: formData,
    });
  },

  async uploadOffersBatchSingleFile(
    projectId: number | string,
    params: {
      file: File;
      mode?: "mc" | "lc";
      companiesConfig: {
        company_name: string;
        price_column?: string;
        quantity_column?: string | null;
        round_number?: number | null;
        round_mode?: "auto" | "new" | "replace";
      }[];
      sheetName?: string | null;
      codeColumns?: string[];
      descriptionColumns?: string[];
      progressiveColumn?: string | null;
    },
  ): Promise<ApiBatchSingleFileResult> {
    const formData = new FormData();
    formData.append("file", params.file);
    formData.append("companies_config", JSON.stringify(params.companiesConfig));
    if (params.mode) {
      formData.append("mode", params.mode);
    }
    if (params.sheetName) {
      formData.append("sheet_name", params.sheetName);
    }
    if (params.codeColumns?.length) {
      formData.append("code_columns", JSON.stringify(params.codeColumns));
    }
    if (params.descriptionColumns?.length) {
      formData.append("description_columns", JSON.stringify(params.descriptionColumns));
    }
    if (params.progressiveColumn) {
      formData.append("progressive_column", params.progressiveColumn);
    }
    return apiFetch<ApiBatchSingleFileResult>(
      `/projects/${projectId}/offers/batch-single-file`,
      {
        method: "POST",
        body: formData,
      },
    );
  },

  async deleteEstimate(
    projectId: number | string,
    estimateId: number | string,
  ): Promise<void> {
    return apiFetch<void>(`/projects/${projectId}/estimate/${estimateId}`, {
      method: "DELETE",
    });
  },

  async getProjectEstimates(
    projectId: number | string,
  ): Promise<ApiEstimate[]> {
    return apiFetch<ApiEstimate[]>(`/projects/${projectId}/project-estimates`);
  },

  async getEstimate(
    projectId: number | string,
    estimateId: number | string,
  ): Promise<ApiEstimate> {
    return apiFetch<ApiEstimate>(`/projects/${projectId}/estimate/${estimateId}`);
  },

  async setBaselineEstimate(
    projectId: number | string,
    estimateId: number | string,
  ): Promise<{ success: boolean; message: string }> {
    return apiFetch<{ success: boolean; message: string }>(
      `/projects/${projectId}/estimates/${estimateId}/set-baseline`,
      {
        method: "PUT",
      },
    );
  },

  async getEstimateWbs(
    estimateIdOrProjectId: number | string,
    estimateId?: number | string
  ): Promise<ApiEstimateWbsSummary> {
    // If second parameter is provided, use it as estimateId (ignoring first param for backward compatibility)
    const actualEstimateId = estimateId !== undefined ? estimateId : estimateIdOrProjectId;
    return apiFetch<ApiEstimateWbsSummary>(`/estimates/${actualEstimateId}/wbs`);
  },

  async getDashboardStats(): Promise<ApiDashboardStats> {
    return apiFetch<ApiDashboardStats>("/dashboard/stats");
  },

  async getProjectComparison(
    projectId: number | string,
    params?: {
      baseline_estimate_id?: number | null;
      discipline?: string | null;
      revision?: string | null;
    },
  ): Promise<ApiOffersComparison> {
    const query = new URLSearchParams();
    if (params?.baseline_estimate_id != null) {
      query.set("baseline_estimate_id", String(params.baseline_estimate_id));
    }
    if (params?.discipline) {
      query.set("discipline", params.discipline);
    }
    if (params?.revision) {
      query.set("revision", params.revision);
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return apiFetch<ApiOffersComparison>(`/projects/${projectId}/comparison${suffix}`);
  },

  async getProjectAnalysis(
    projectId: number | string,
    params?: {
      baseline_estimate_id?: number | null;
      discipline?: string | null;
      revision?: string | null;
      round_number?: number | null;
      company?: string | null;
    },
  ): Promise<ApiProjectAnalysis> {
    const query = new URLSearchParams();
    if (params?.baseline_estimate_id != null) {
      query.set("baseline_estimate_id", String(params.baseline_estimate_id));
    }
    if (params?.discipline) {
      query.set("discipline", params.discipline);
    }
    if (params?.revision) {
      query.set("revision", params.revision);
    }
    if (params?.round_number != null) {
      query.set("round_number", String(params.round_number));
    }
    if (params?.company) {
      query.set("company", params.company);
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return apiFetch<ApiProjectAnalysis>(`/projects/${projectId}/analysis${suffix}`);
  },

  async getProjectAnalysisWbs6(
    projectId: number | string,
    wbs6Id: string,
    params?: { round_number?: number | null; company?: string | null },
  ): Promise<ApiAnalysisWbs6Trend> {
    const query = new URLSearchParams();
    if (params?.round_number != null) {
      query.set("round_number", String(params.round_number));
    }
    if (params?.company) {
      query.set("company", params.company);
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return apiFetch<ApiAnalysisWbs6Trend>(
      `/projects/${projectId}/analysis/wbs6/${wbs6Id}${suffix}`,
    );
  },

  async getProjectTrendRound(
    projectId: number | string,
    params?: { company?: string | null },
  ): Promise<ApiTrendEvolution> {
    const query = new URLSearchParams();
    if (params?.company) {
      query.set("company", params.company);
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return apiFetch<ApiTrendEvolution>(
      `/projects/${projectId}/analysis/trend-round${suffix}`,
    );
  },

  async getProjectCompetitivenessHeatmap(
    projectId: number | string,
    params?: { round_number?: number | null },
  ): Promise<ApiHeatmapCompetitiveness> {
    const query = new URLSearchParams();
    if (params?.round_number != null) {
      query.set("round_number", String(params.round_number));
    }
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return apiFetch<ApiHeatmapCompetitiveness>(
      `/projects/${projectId}/analysis/heatmap-competitiveness${suffix}`,
    );
  },

  async getSettings(): Promise<ApiSettingsResponse> {
    return apiFetch<ApiSettingsResponse>("/settings/");
  },

  async listImportConfigs(options?: {
    projectId?: number | string | null;
  }): Promise<ApiImportConfig[]> {
    const params = new URLSearchParams();
    if (options?.projectId !== undefined && options?.projectId !== null) {
      params.set("project_id", String(options.projectId));
    }
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return apiFetch<ApiImportConfig[]>(`/import-configs${suffix}`);
  },

  async createImportConfig(
    payload: ApiImportConfigCreate,
    options?: { projectId?: number | string | null },
  ): Promise<ApiImportConfig> {
    const params = new URLSearchParams();
    if (options?.projectId !== undefined && options?.projectId !== null) {
      params.set("project_id", String(options.projectId));
    }
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return apiFetch<ApiImportConfig>(`/import-configs${suffix}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateImportConfig(
    configId: number | string,
    payload: ApiImportConfigCreate,
  ): Promise<ApiImportConfig> {
    return apiFetch<ApiImportConfig>(`/import-configs/${configId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteImportConfig(configId: number | string): Promise<void> {
  await apiFetch<void>(`/import-configs/${configId}`, {
    method: "DELETE",
  });
},


  async updateSettings(payload: {
    critical_min_delta?: number;
    critical_max_delta?: number;
    high_cme_percentage?: number;
    low_cme_percentage?: number;
    nlp_model_id?: string;
    nlp_batch_size?: number;
    nlp_max_length?: number;
  }): Promise<ApiSettingsResponse> {
    return apiFetch<ApiSettingsResponse>("/settings/", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async regenerateEmbeddings(projectId?: number): Promise<{
    message: string;
    total: number;
    updated: number;
    skipped: number;
    errors: number;
  }> {
    const params = new URLSearchParams();
    if (projectId !== undefined) {
      params.set("project_id", String(projectId));
    }
    const url = `/settings/regenerate-embeddings${params.toString() ? `?${params.toString()}` : ""}`;
    return apiFetch(url, {
      method: "POST",
    });
  },

  async regenerateProperties(projectId?: number): Promise<{
    message: string;
    total: number;
    updated: number;
    skipped: number;
    errors: number;
  }> {
    const params = new URLSearchParams();
    if (projectId !== undefined) {
      params.set("project_id", String(projectId));
    }
    const url = `/settings/regenerate-properties${params.toString() ? `?${params.toString()}` : ""}`;
    return apiFetch(url, {
      method: "POST",
    });
  },

  async normalizeCompanies(projectId?: number): Promise<{
    message: string;
    total: number;
    updated: number;
    errors: number;
  }> {
    const params = new URLSearchParams();
    if (projectId !== undefined) {
      params.set("project_id", String(projectId));
    }
    const url = `/settings/normalize-companies${params.toString() ? `?${params.toString()}` : ""}`;
    return apiFetch(url, {
      method: "POST",
    });
  },

  async getProjectPriceCatalog(
    projectId: number | string,
    options?: { usedOnly?: boolean },
  ): Promise<ApiPriceListItem[]> {
    const params = new URLSearchParams();
    if (options?.usedOnly) {
      params.set("used_only", "true");
    }
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return apiFetch<ApiPriceListItem[]>(`/projects/${projectId}/price-catalog${suffix}`);
  },

  async getGlobalPriceCatalog(options?: {
    search?: string;
    projectId?: number | string | null;
    businessUnit?: string | null;
  }): Promise<ApiPriceListItem[]> {
    const params = new URLSearchParams();
    if (options?.search) {
      params.set("search", options.search);
    }
    if (options?.projectId !== undefined && options?.projectId !== null) {
      params.set("project_id", String(options.projectId));
    }
    if (options?.businessUnit) {
      params.set("business_unit", options.businessUnit);
    }
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return apiFetch<ApiPriceListItem[]>(`/projects/price-catalog${suffix}`);
  },

  async semanticPriceCatalogSearch(params: {
    query: string;
    projectId?: number | string;
    topK?: number;
    minScore?: number;
  }): Promise<ApiPriceListItemSearchResult[]> {
    const searchParams = new URLSearchParams();
    searchParams.set("query", params.query);
    if (params.projectId !== undefined && params.projectId !== null) {
      searchParams.set("project_id", String(params.projectId));
    }
    if (params.topK !== undefined) {
      searchParams.set("top_k", String(params.topK));
    }
    if (params.minScore !== undefined) {
      searchParams.set("min_score", String(params.minScore));
    }
    const suffix = searchParams.toString();
    return apiFetch<ApiPriceListItemSearchResult[]>(
      `/projects/price-catalog/semantic-search?${suffix}`,
    );
  },

  async getPriceCatalogSummary(): Promise<ApiPriceCatalogSummary> {
    return apiFetch<ApiPriceCatalogSummary>(`/projects/price-catalog/summary`);
  },

  async updateManualOfferPrice(
    projectId: number | string,
    payload: {
      price_list_item_id: number;
      estimate_id: number;
      unit_price: number;
      quantity?: number | null;
    },
  ): Promise<ApiManualPriceUpdateResponse> {
    return apiFetch<ApiManualPriceUpdateResponse>(
      `/projects/${projectId}/offers/manual-price`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  async login(payload: { email: string; password: string }): Promise<ApiAuthResponse> {
    return apiFetch<ApiAuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async register(payload: {
    email: string;
    password: string;
    full_name?: string | null;
  }): Promise<ApiUser> {
    return apiFetch<ApiUser>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getCurrentUser(): Promise<ApiUser> {
    return apiFetch<ApiUser>("/me");
  },

  async getProfile(): Promise<ApiUserProfile> {
    return apiFetch<ApiUserProfile>("/profile");
  },

  async updateProfile(payload: Partial<ApiUserProfile>): Promise<ApiUserProfile> {
    return apiFetch<ApiUserProfile>("/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async logout(): Promise<void> {
    await apiFetch<void>("/auth/logout", { method: "POST" });
  },

  async getPropertySchemas(): Promise<PropertySchemaResponse> {
    if (propertySchemasStaticOnly || propertySchemasFallbackPreferred) {
      return fetchPropertySchemasStatic();
    }
    try {
      return await apiFetch<PropertySchemaResponse>("/settings/property-schemas");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const is404 = message.includes("404");
      if (!is404) {
        throw error;
      }
      propertySchemasFallbackPreferred = true;
      return fetchPropertySchemasStatic();
    }
  },

  async extractProperties(payload: PropertyExtractionPayload): Promise<PropertyExtractionResult> {
    const allowFallback = !propertyExtractionNoFallback;

    if (propertyExtractionStaticOnly || (allowFallback && propertyExtractionFallbackPreferred)) {
      return buildExtractionFallback(payload);
    }
    try {
      return await apiFetch<PropertyExtractionResult>("/settings/extract-properties", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const is404 = message.includes("404");
      if (is404 && apiBaseWithoutPrefix !== apiBaseNoTrailing) {
        try {
          const altUrl = `${apiBaseWithoutPrefix}/settings/extract-properties`;
          return await tryExtractAtUrl(altUrl, payload);
        } catch (altError) {
          const altMessage = altError instanceof Error ? altError.message : String(altError);
          if (!altMessage.includes("404")) {
            throw altError;
          }
        }
      }
      if (!is404) {
        throw error;
      }
      if (!allowFallback) {
        throw error;
      }
      propertyExtractionFallbackPreferred = true;
      return buildExtractionFallback(payload);
    }
  },

  // Overload for semanticSearchPriceCatalog to accept simple parameters
  async semanticSearchPriceCatalog(
    queryOrParams: string | { query: string; projectId?: number | string; topK?: number; minScore?: number },
    threshold?: number
  ): Promise<ApiPriceListItemSearchResult[]> {
    // If first param is string, use simple signature
    if (typeof queryOrParams === 'string') {
      return this.semanticPriceCatalogSearch({
        query: queryOrParams,
        minScore: threshold,
      });
    }
    // Otherwise use object signature
    return this.semanticPriceCatalogSearch(queryOrParams);
  },
};
