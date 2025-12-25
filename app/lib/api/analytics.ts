/**
 * Analytics API endpoints
 * Project analysis, comparison, heatmaps, trends
 */

import type {
    ApiProjectAnalysis,
    ApiAnalysisWbs6Trend,
    ApiOffersComparison,
    ApiHeatmapCompetitiveness,
    ApiTrendEvolution,
    ApiManualPriceUpdateResponse,
} from "@/types/api";
import { apiFetch, buildQueryString } from "./client";

export const analyticsApi = {
    async getComparison(
        projectId: number | string,
        params?: {
            baseline_estimate_id?: number | null;
            discipline?: string | null;
            revision?: string | null;
        },
    ): Promise<ApiOffersComparison> {
        const suffix = buildQueryString({
            baseline_estimate_id: params?.baseline_estimate_id,
            discipline: params?.discipline,
            revision: params?.revision,
        });
        return apiFetch<ApiOffersComparison>(`/projects/${projectId}/comparison${suffix}`);
    },

    async getAnalysis(
        projectId: number | string,
        params?: {
            baseline_estimate_id?: number | null;
            discipline?: string | null;
            revision?: string | null;
            round_number?: number | null;
            company?: string | null;
        },
    ): Promise<ApiProjectAnalysis> {
        const suffix = buildQueryString({
            baseline_estimate_id: params?.baseline_estimate_id,
            discipline: params?.discipline,
            revision: params?.revision,
            round_number: params?.round_number,
            company: params?.company,
        });
        return apiFetch<ApiProjectAnalysis>(`/projects/${projectId}/analysis${suffix}`);
    },

    async getWbs6Trend(
        projectId: number | string,
        wbs6Id: string,
        params?: { round_number?: number | null; company?: string | null },
    ): Promise<ApiAnalysisWbs6Trend> {
        const suffix = buildQueryString({
            round_number: params?.round_number,
            company: params?.company,
        });
        return apiFetch<ApiAnalysisWbs6Trend>(
            `/projects/${projectId}/analysis/wbs6/${wbs6Id}${suffix}`,
        );
    },

    async getTrendRound(
        projectId: number | string,
        params?: { company?: string | null },
    ): Promise<ApiTrendEvolution> {
        const suffix = buildQueryString({ company: params?.company });
        return apiFetch<ApiTrendEvolution>(
            `/projects/${projectId}/analysis/trend-round${suffix}`,
        );
    },

    async getCompetitivenessHeatmap(
        projectId: number | string,
        params?: { round_number?: number | null },
    ): Promise<ApiHeatmapCompetitiveness> {
        const suffix = buildQueryString({ round_number: params?.round_number });
        return apiFetch<ApiHeatmapCompetitiveness>(
            `/projects/${projectId}/analysis/heatmap-competitiveness${suffix}`,
        );
    },

    async updateManualPrice(
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
};
