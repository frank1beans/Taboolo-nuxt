/**
 * API Client - Backward Compatibility Re-export
 * 
 * This file now re-exports from the modular structure in ./api/
 * 
 * For new code, prefer importing directly from the modules:
 * - import { projectsApi } from '@/lib/api/projects'
 * - import { estimatesApi } from '@/lib/api/estimates'
 * - import { analyticsApi } from '@/lib/api/analytics'
 * - import { catalogApi } from '@/lib/api/catalog'
 * - import { settingsApi } from '@/lib/api/settings'
 * - import { authApi } from '@/lib/api/auth'
 * - import { dashboardApi } from '@/lib/api/dashboard'
 */

// Re-export everything from the modular structure
export * from "./api";

// Default export for backward compatibility
export { api as default } from "./api";
