import { useQuery } from '@tanstack/vue-query'
import { computed, unref, type MaybeRef } from 'vue'
import { api } from '~/lib/api-client'

/**
 * Query key factory for analysis queries
 */
export const analysisKeys = {
  all: ['analysis'] as const,
  project: (projectId: number | string, filters?: Record<string, unknown>) =>
    [...analysisKeys.all, 'project', String(projectId), filters] as const,
  comparison: (projectId: number | string, params?: Record<string, unknown>) =>
    [...analysisKeys.all, 'comparison', String(projectId), params] as const,
  round: (projectId: number | string, roundA: string, roundB?: string) =>
    [...analysisKeys.all, 'round', String(projectId), roundA, roundB] as const,
}

/**
 * Stale time configuration
 */
export const analysisStaleTime = {
  project: 2 * 60 * 1000, // 2 minutes - analysis can change
  comparison: 3 * 60 * 1000, // 3 minutes
}

/**
 * Get project analysis data
 * Includes: amounts comparison, variations distribution, critical items
 */
export const useProjectAnalysis = (
  projectId: MaybeRef<number | string | null | undefined>,
  filters?: MaybeRef<Record<string, unknown> | undefined>
) => {
  const pId = computed(() => {
    const val = unref(projectId)
    return val ? String(val) : null
  })

  const activeFilters = computed(() => unref(filters))

  return useQuery({
    queryKey: computed(() => analysisKeys.project(pId.value!, activeFilters.value)),
    queryFn: () => api.getProjectAnalysis(pId.value!, activeFilters.value),
    enabled: computed(() => !!pId.value),
    staleTime: analysisStaleTime.project,
  })
}

/**
 * Get round comparison analysis
 */
export const useRoundComparison = (
  projectId: MaybeRef<number | string | null | undefined>,
  roundA: MaybeRef<string | null | undefined>,
  roundB?: MaybeRef<string | null | undefined>
) => {
  const pId = computed(() => {
    const val = unref(projectId)
    return val ? String(val) : null
  })

  const rA = computed(() => unref(roundA))
  const rB = computed(() => unref(roundB))

  return useQuery({
    queryKey: computed(() => analysisKeys.round(pId.value!, rA.value!, rB.value)),
    queryFn: () => api.compareRounds(pId.value!, rA.value!, rB.value),
    enabled: computed(() => !!pId.value && !!rA.value),
    staleTime: analysisStaleTime.comparison,
  })
}

/**
 * Get offers comparison
 */
export const useOffersComparison = (
  projectId: MaybeRef<number | string | null | undefined>,
  params?: MaybeRef<Record<string, unknown> | undefined>
) => {
  const pId = computed(() => {
    const val = unref(projectId)
    return val ? String(val) : null
  })

  const activeParams = computed(() => unref(params))

  return useQuery({
    queryKey: computed(() => analysisKeys.comparison(pId.value!, activeParams.value)),
    queryFn: () => api.getProjectComparison(pId.value!, activeParams.value),
    enabled: computed(() => !!pId.value),
    staleTime: analysisStaleTime.comparison,
  })
}
