/**
 * Settings API endpoints
 * App settings, embeddings, property schemas
 */

import type {
    ApiSettingsResponse,
    ApiImportConfig,
    ApiImportConfigCreate,
    PropertySchemaResponse,
    PropertyExtractionPayload,
    PropertyExtractionResult,
} from "@/types/api";
import { apiFetch, authHeaders, apiBaseWithoutPrefix, apiBaseNoTrailing, buildQueryString } from "./client";

// Static mode flags
const propertySchemasStaticOnly =
    (import.meta.env.VITE_PROPERTY_SCHEMAS_STATIC as string | undefined)?.toLowerCase() === "true" ||
    (import.meta.env.VITE_PROPERTY_SCHEMAS_STATIC as string | undefined) === "1";

const propertyExtractionStaticOnly =
    (import.meta.env.VITE_PROPERTY_EXTRACTION_STATIC as string | undefined)?.toLowerCase() === "true" ||
    (import.meta.env.VITE_PROPERTY_EXTRACTION_STATIC as string | undefined) === "1";

const propertyExtractionNoFallback =
    (import.meta.env.VITE_PROPERTY_EXTRACTION_NO_FALLBACK as string | undefined)?.toLowerCase() === "true" ||
    (import.meta.env.VITE_PROPERTY_EXTRACTION_NO_FALLBACK as string | undefined) === "1";

let propertySchemasFallbackPreferred = false;
let propertyExtractionFallbackPreferred = false;

// Helpers
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

export const settingsApi = {
    async get(): Promise<ApiSettingsResponse> {
        return apiFetch<ApiSettingsResponse>("/settings/");
    },

    async update(payload: {
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
        const suffix = buildQueryString({ project_id: projectId });
        return apiFetch(`/settings/regenerate-embeddings${suffix}`, { method: "POST" });
    },

    async regenerateProperties(projectId?: number): Promise<{
        message: string;
        total: number;
        updated: number;
        skipped: number;
        errors: number;
    }> {
        const suffix = buildQueryString({ project_id: projectId });
        return apiFetch(`/settings/regenerate-properties${suffix}`, { method: "POST" });
    },

    async normalizeCompanies(projectId?: number): Promise<{
        message: string;
        total: number;
        updated: number;
        errors: number;
    }> {
        const suffix = buildQueryString({ project_id: projectId });
        return apiFetch(`/settings/normalize-companies${suffix}`, { method: "POST" });
    },

    async getPropertySchemas(): Promise<PropertySchemaResponse> {
        if (propertySchemasStaticOnly || propertySchemasFallbackPreferred) {
            return fetchPropertySchemasStatic();
        }
        try {
            return await apiFetch<PropertySchemaResponse>("/settings/property-schemas");
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (!message.includes("404")) {
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

            if (!is404 || !allowFallback) {
                throw error;
            }

            propertyExtractionFallbackPreferred = true;
            return buildExtractionFallback(payload);
        }
    },
};

export const importConfigsApi = {
    async list(options?: { projectId?: number | string | null }): Promise<ApiImportConfig[]> {
        const suffix = buildQueryString({ project_id: options?.projectId });
        return apiFetch<ApiImportConfig[]>(`/import-configs${suffix}`);
    },

    async create(
        payload: ApiImportConfigCreate,
        options?: { projectId?: number | string | null },
    ): Promise<ApiImportConfig> {
        const suffix = buildQueryString({ project_id: options?.projectId });
        return apiFetch<ApiImportConfig>(`/import-configs${suffix}`, {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    async update(configId: number | string, payload: ApiImportConfigCreate): Promise<ApiImportConfig> {
        return apiFetch<ApiImportConfig>(`/import-configs/${configId}`, {
            method: "PUT",
            body: JSON.stringify(payload),
        });
    },

    async delete(configId: number | string): Promise<void> {
        await apiFetch(`/import-configs/${configId}`, { method: "DELETE" });
    },
};
