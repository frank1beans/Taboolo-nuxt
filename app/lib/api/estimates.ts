/**
 * Estimates API endpoints
 * Upload, SIX/XPWE import, offers management
 */

import type {
    ApiEstimate,
    ApiEstimateWbsSummary,
    ApiEstimateMergeRequest,
    ApiEstimateMergeResponse,
    ApiSixEstimatesPreview,
    ApiSixImportReport,
    ApiXpweEstimatesPreview,
    ApiXpweImportReport,
    ApiBatchSingleFileResult,
    ApiOfferImportResult,
} from "@/types/api";
import { apiFetch, buildQueryString } from "./client";

export const estimatesApi = {
    async list(projectId: number | string): Promise<ApiEstimate[]> {
        return apiFetch<ApiEstimate[]>(`/projects/${projectId}/project-estimates`);
    },

    async get(projectId: number | string, estimateId: number | string): Promise<ApiEstimate> {
        return apiFetch<ApiEstimate>(`/projects/${projectId}/estimate/${estimateId}`);
    },

    async delete(projectId: number | string, estimateId: number | string): Promise<void> {
        await apiFetch(`/projects/${projectId}/estimate/${estimateId}`, {
            method: "DELETE",
        });
    },

    async setBaseline(
        projectId: number | string,
        estimateId: number | string,
    ): Promise<{ success: boolean; message: string }> {
        return apiFetch<{ success: boolean; message: string }>(
            `/projects/${projectId}/estimates/${estimateId}/set-baseline`,
            { method: "PUT" },
        );
    },

    async getWbs(
        estimateIdOrProjectId: number | string,
        estimateId?: number | string
    ): Promise<ApiEstimateWbsSummary> {
        const actualEstimateId = estimateId !== undefined ? estimateId : estimateIdOrProjectId;
        return apiFetch<ApiEstimateWbsSummary>(`/estimates/${actualEstimateId}/wbs`);
    },

    async merge(
        projectId: number | string,
        payload: ApiEstimateMergeRequest,
    ): Promise<ApiEstimateMergeResponse> {
        return apiFetch<ApiEstimateMergeResponse>(`/projects/${projectId}/estimates/merge`, {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    async upload(
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
        if (options?.discipline) formData.append("discipline", options.discipline);
        if (options?.revision) formData.append("revision", options.revision);
        if (options?.isBaseline !== undefined) formData.append("is_baseline", String(options.isBaseline));

        return apiFetch<ApiEstimate>(`/projects/${projectId}/project-estimate`, {
            method: "POST",
            body: formData,
        });
    },

    // SIX Format
    async previewSix(
        projectId: number | string,
        file: File,
        options?: { raw?: boolean }
    ): Promise<ApiSixEstimatesPreview> {
        const formData = new FormData();
        formData.append("file", file);
        const suffix = buildQueryString({ mode: options?.raw ? "raw" : undefined });

        return apiFetch<ApiSixEstimatesPreview>(
            `/projects/${projectId}/import-six/preview${suffix}`,
            { method: "POST", body: formData },
        );
    },

    async importSix(
        projectId: number | string,
        file: File,
        estimateId?: string | null,
        options?: {
            enableEmbeddings?: boolean;
            enablePropertyExtraction?: boolean;
            raw?: boolean;
        },
    ): Promise<ApiSixImportReport> {
        const formData = new FormData();
        formData.append("file", file);
        if (estimateId) formData.append("estimate_id", estimateId);
        if (options?.enableEmbeddings) formData.append("compute_embeddings", "true");
        if (options?.enablePropertyExtraction) formData.append("extract_properties", "true");

        const suffix = buildQueryString({ mode: options?.raw ? "raw" : undefined });

        return apiFetch<ApiSixImportReport>(`/projects/${projectId}/import-six${suffix}`, {
            method: "POST",
            body: formData,
        });
    },

    // XPWE Format
    async previewXpwe(
        projectId: number | string,
        file: File,
        options?: { raw?: boolean }
    ): Promise<ApiXpweEstimatesPreview> {
        const formData = new FormData();
        formData.append("file", file);
        const suffix = buildQueryString({ mode: options?.raw ? "raw" : undefined });

        return apiFetch<ApiXpweEstimatesPreview>(
            `/projects/${projectId}/import-xpwe/preview${suffix}`,
            { method: "POST", body: formData },
        );
    },

    async importXpwe(
        projectId: number | string,
        file: File,
        estimateId?: string | null,
        options?: {
            raw?: boolean;
            wbsMapping?: Record<string, string>;
            enableEmbeddings?: boolean;
        },
    ): Promise<ApiXpweImportReport> {
        const formData = new FormData();
        formData.append("file", file);
        if (estimateId) formData.append("estimate_id", estimateId);
        if (options?.wbsMapping) formData.append("wbs_mapping", JSON.stringify(options.wbsMapping));
        if (options?.enableEmbeddings) formData.append("compute_embeddings", "true");

        const suffix = buildQueryString({ mode: options?.raw ? "raw" : undefined });

        return apiFetch<ApiXpweImportReport>(`/projects/${projectId}/import-xpwe${suffix}`, {
            method: "POST",
            body: formData,
        });
    },

    // Offers
    async uploadOffer(
        projectId: number | string,
        params: {
            file: File;
            company: string;
            mode?: "lx" | "mx";
            roundMode: "auto" | "new" | "replace";
            roundNumber?: number | null;
            discipline?: string;
            sheetName: string;
            codeColumns: string[];
            descriptionColumns: string[];
            longDescriptionColumns?: string[];
            priceColumn?: string;
            quantityColumn?: string;
            progressColumn?: string;
            sourceEstimateId?: string;
            headerRowIndex?: number;
        },
    ): Promise<ApiOfferImportResult> {
        const formData = new FormData();
        formData.append("file", params.file);
        formData.append("company", params.company);
        formData.append("mode", params.mode || "lx");
        formData.append("sheetName", params.sheetName);
        formData.append("round_mode", params.roundMode);

        if (params.roundNumber != null) formData.append("round_number", String(params.roundNumber));
        if (params.discipline) formData.append("discipline", params.discipline);

        params.codeColumns.forEach(col => formData.append("code_columns", col));
        params.descriptionColumns.forEach(col => formData.append("description_columns", col));
        if (params.longDescriptionColumns) {
            params.longDescriptionColumns.forEach(col => formData.append("long_description_columns", col));
        }

        if (params.priceColumn) formData.append("price_column", params.priceColumn);
        if (params.quantityColumn) formData.append("quantity_column", params.quantityColumn);
        if (params.progressColumn) formData.append("progressive_column", params.progressColumn);
        if (params.sourceEstimateId) formData.append("estimate_id", params.sourceEstimateId);
        if (params.headerRowIndex !== undefined) formData.append("header_row_index", String(params.headerRowIndex));

        const suffix = buildQueryString({
            estimate_id: params.sourceEstimateId,
            mode: params.mode,
            company: params.company,
            round_number: params.roundNumber,
            round_mode: params.roundMode,
        });

        return apiFetch<ApiOfferImportResult>(`/projects/${projectId}/offers${suffix}`, {
            method: "POST",
            body: formData,
        });
    },

    async uploadOffersBatch(
        projectId: number | string,
        params: {
            file: File;
            mode?: "lx" | "mx";
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

        if (params.mode) formData.append("mode", params.mode);
        if (params.sheetName) formData.append("sheet_name", params.sheetName);
        if (params.codeColumns?.length) formData.append("code_columns", JSON.stringify(params.codeColumns));
        if (params.descriptionColumns?.length) formData.append("description_columns", JSON.stringify(params.descriptionColumns));
        if (params.progressiveColumn) formData.append("progressive_column", params.progressiveColumn);

        return apiFetch<ApiBatchSingleFileResult>(
            `/projects/${projectId}/offers/batch-single-file`,
            { method: "POST", body: formData },
        );
    },
};
