/**
 * Catalog API endpoints
 * Price list items, semantic search
 */

import type {
    ApiPriceListItem,
    ApiPriceListItemSearchResult,
    ApiPriceCatalogSummary,
} from "@/types/api";
import { apiFetch, buildQueryString } from "./client";

export const catalogApi = {
    async getProjectPriceList(
        projectId: number | string,
        options: { estimateId: string | number; usedOnly?: boolean },
    ): Promise<ApiPriceListItem[]> {
        const suffix = buildQueryString({
            estimate_id: options.estimateId,
            used_only: options.usedOnly ? "true" : undefined,
        });
        return apiFetch<ApiPriceListItem[]>(
            `/projects/${projectId}/estimates/${options.estimateId}/price-list${suffix}`
        );
    },

    async getGlobal(options?: {
        search?: string;
        projectId?: number | string | null;
        businessUnit?: string | null;
    }): Promise<ApiPriceListItem[]> {
        const suffix = buildQueryString({
            search: options?.search,
            project_id: options?.projectId,
            business_unit: options?.businessUnit,
        });
        return apiFetch<ApiPriceListItem[]>(`/catalog${suffix}`);
    },

    async semanticSearch(params: {
        query: string;
        projectId?: number | string;
        topK?: number;
        minScore?: number;
    }): Promise<ApiPriceListItemSearchResult[]> {
        const suffix = buildQueryString({
            query: params.query,
            project_id: params.projectId,
            top_k: params.topK,
            min_score: params.minScore,
        });
        return apiFetch<ApiPriceListItemSearchResult[]>(`/catalog/semantic-search?${suffix.slice(1)}`);
    },

    async getSummary(): Promise<ApiPriceCatalogSummary> {
        return apiFetch<ApiPriceCatalogSummary>("/catalog/summary");
    },
};
