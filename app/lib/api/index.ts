/**
 * API Client - Modular Entry Point
 * 
 * This file provides backward compatibility with the original monolithic api-client.ts
 * while using the new modular structure internally.
 * 
 * New code should import from the specific modules:
 * - import { projectsApi } from '@/lib/api/projects'
 * - import { estimatesApi } from '@/lib/api/estimates'
 * - etc.
 */

// Re-export all APIs for modular usage
export { apiFetch, buildQueryString, getApiBaseUrl, API_BASE_URL } from "./client";
export { projectsApi } from "./projects";
export { estimatesApi } from "./estimates";
export { analyticsApi } from "./analytics";
export { catalogApi } from "./catalog";
export { settingsApi, importConfigsApi } from "./settings";
export { authApi } from "./auth";
export { dashboardApi } from "./dashboard";

// Re-export types
export type { ApiProject } from "@/types/api";

// Import for backward compatibility layer
import { projectsApi } from "./projects";
import { estimatesApi } from "./estimates";
import { analyticsApi } from "./analytics";
import { catalogApi } from "./catalog";
import { settingsApi, importConfigsApi } from "./settings";
import { authApi } from "./auth";
import { dashboardApi } from "./dashboard";

/**
 * Backward-compatible API object
 * @deprecated Use individual API modules instead (projectsApi, estimatesApi, etc.)
 */
export const api = {
    // Projects
    listProjects: projectsApi.list,
    getProject: projectsApi.get,
    createProject: projectsApi.create,
    updateProject: projectsApi.update,
    deleteProject: projectsApi.delete,
    getProjectPreferences: projectsApi.getPreferences,
    updateProjectPreferences: projectsApi.updatePreferences,
    getProjectWbsStructure: projectsApi.getWbsStructure,
    uploadProjectWbs: projectsApi.uploadWbs,
    getWbsVisibility: projectsApi.getWbsVisibility,
    updateWbsVisibility: projectsApi.updateWbsVisibility,
    exportProjectBundle: projectsApi.exportBundle,
    importProjectBundle: projectsApi.importBundle,

    // Estimates
    getProjectEstimates: estimatesApi.list,
    getEstimate: estimatesApi.get,
    deleteEstimate: estimatesApi.delete,
    setBaselineEstimate: estimatesApi.setBaseline,
    getEstimateWbs: estimatesApi.getWbs,
    uploadProjectEstimate: estimatesApi.upload,
    previewSixEstimates: estimatesApi.previewSix,
    importSixFile: estimatesApi.importSix,
    previewXpweEstimates: estimatesApi.previewXpwe,
    importXpweFile: estimatesApi.importXpwe,
    uploadBidOffer: estimatesApi.uploadOffer,
    uploadOffersBatchSingleFile: estimatesApi.uploadOffersBatch,

    // Analytics
    getProjectComparison: analyticsApi.getComparison,
    getProjectAnalysis: analyticsApi.getAnalysis,
    getProjectAnalysisWbs6: analyticsApi.getWbs6Trend,
    getProjectTrendRound: analyticsApi.getTrendRound,
    getProjectCompetitivenessHeatmap: analyticsApi.getCompetitivenessHeatmap,
    updateManualOfferPrice: analyticsApi.updateManualPrice,

    // Catalog
    getProjectPriceCatalog: catalogApi.getProjectPriceList,
    getGlobalPriceCatalog: catalogApi.getGlobal,
    semanticPriceCatalogSearch: catalogApi.semanticSearch,
    getPriceCatalogSummary: catalogApi.getSummary,
    semanticSearchPriceCatalog: (
        queryOrParams: string | { query: string; projectId?: number | string; topK?: number; minScore?: number },
        threshold?: number
    ) => {
        if (typeof queryOrParams === 'string') {
            return catalogApi.semanticSearch({ query: queryOrParams, minScore: threshold });
        }
        return catalogApi.semanticSearch(queryOrParams);
    },

    // Settings
    getSettings: settingsApi.get,
    updateSettings: settingsApi.update,
    regenerateEmbeddings: settingsApi.regenerateEmbeddings,
    regenerateProperties: settingsApi.regenerateProperties,
    normalizeCompanies: settingsApi.normalizeCompanies,
    getPropertySchemas: settingsApi.getPropertySchemas,
    extractProperties: settingsApi.extractProperties,
    listImportConfigs: importConfigsApi.list,
    createImportConfig: importConfigsApi.create,
    updateImportConfig: importConfigsApi.update,
    deleteImportConfig: importConfigsApi.delete,

    // Auth
    login: authApi.login,
    register: authApi.register,
    logout: authApi.logout,
    getCurrentUser: authApi.getCurrentUser,
    getProfile: authApi.getProfile,
    updateProfile: authApi.updateProfile,

    // Dashboard
    getDashboardStats: dashboardApi.getStats,
};
