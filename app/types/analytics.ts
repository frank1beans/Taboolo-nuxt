/**
 * Shared types for analytics composables
 */

export interface GlobalFilters {
    projectIds: string[]
    year: number | null
    businessUnit: string | null
}

export interface ProjectInfo {
    id: string
    name: string
    code: string
    business_unit: string | null
    year: number | null
}
