/**
 * Projects API endpoints
 * CRUD operations for projects, preferences, WBS
 */

import type {
    ApiProject,
    ApiProjectDetail,
    ApiProjectPreferences,
    ApiProjectPreferencesCreate,
    ApiProjectWbs,
    ApiWbsImportStats,
    ApiWbsVisibilityEntry,
    ProjectStatus,
} from "@/types/api";
import { apiFetch, API_BASE_URL, buildQueryString } from "./client";
import { getAccessToken } from "../auth-storage";
import { toast } from "vue-sonner";

export const projectsApi = {
    async list(): Promise<ApiProject[]> {
        return apiFetch<ApiProject[]>("/projects");
    },

    async get(id: number | string): Promise<ApiProjectDetail> {
        return apiFetch<ApiProjectDetail>(`/projects/${id}`);
    },

    async create(payload: {
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

    async update(
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

    async delete(projectId: number | string): Promise<void> {
        await apiFetch(`/projects/${projectId}`, {
            method: "DELETE",
        });
    },

    async getPreferences(projectId: number | string): Promise<ApiProjectPreferences> {
        return apiFetch<ApiProjectPreferences>(`/projects/${projectId}/preferences`);
    },

    async updatePreferences(
        projectId: number | string,
        payload: ApiProjectPreferencesCreate
    ): Promise<ApiProjectPreferences> {
        return apiFetch<ApiProjectPreferences>(`/projects/${projectId}/preferences`, {
            method: "PUT",
            body: JSON.stringify(payload),
        });
    },

    async getWbsStructure(
        projectId: number | string,
        estimateId: number | string,
    ): Promise<ApiProjectWbs> {
        return apiFetch<ApiProjectWbs>(`/projects/${projectId}/estimates/${estimateId}/wbs`);
    },

    async uploadWbs(
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

    async getWbsVisibility(projectId: number | string): Promise<ApiWbsVisibilityEntry[]> {
        return apiFetch<ApiWbsVisibilityEntry[]>(`/projects/${projectId}/wbs/visibility`);
    },

    async updateWbsVisibility(
        projectId: number | string,
        payload: { level: number; node_id: number; hidden: boolean }[],
    ): Promise<ApiWbsVisibilityEntry[]> {
        return apiFetch<ApiWbsVisibilityEntry[]>(`/projects/${projectId}/wbs/visibility`, {
            method: "PUT",
            body: JSON.stringify(payload),
        });
    },

    async exportBundle(projectId: number | string): Promise<{ blob: Blob; filename: string }> {
        const token = getAccessToken();
        const response = await fetch(`${API_BASE_URL}/projects/${projectId}/bundle`, {
            method: "GET",
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                toast.error("Session expired. Please sign in again.");
                if (typeof window !== "undefined") {
                    setTimeout(() => {
                        window.location.href = "/login";
                    }, 100);
                }
                throw new Error("Unauthorized");
            }
            const text = await response.text();
            toast.error(text || "An error occurred while processing the request");
            throw new Error(text || `Request failed with status ${response.status}`);
        }

        const contentDisposition = response.headers.get("content-disposition") ?? "";
        const filenameMatch = contentDisposition.match(/filename\*?=([^;]+)/i);
        const filename = filenameMatch
            ? decodeURIComponent(filenameMatch[1].replace(/^"|"$/g, "").replace("UTF-8''", ""))
            : `project-${projectId}.mmcomm`;

        const blob = await response.blob();
        return { blob, filename };
    },

    async importBundle(
        file: File,
        options?: { overwrite?: boolean },
    ): Promise<ApiProject> {
        const formData = new FormData();
        formData.append("file", file);
        const suffix = buildQueryString({ overwrite: options?.overwrite ? "true" : undefined });
        return apiFetch<ApiProject>(`/projects/import-bundle${suffix}`, {
            method: "POST",
            body: formData,
        });
    },
};
