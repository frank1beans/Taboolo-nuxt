/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { computed, unref, type MaybeRef } from 'vue'
import { api } from '~/lib/api-client'
import { toast } from 'vue-sonner'

/**
 * Query key factory for WBS-related queries
 */
export const wbsKeys = {
  all: ['wbs'] as const,
  trees: () => [...wbsKeys.all, 'tree'] as const,
  tree: (projectId: number | string, computoId?: number | string) =>
    computoId
      ? [...wbsKeys.trees(), String(projectId), String(computoId)]
      : [...wbsKeys.trees(), String(projectId)],
  summaries: () => [...wbsKeys.all, 'summary'] as const,
  summary: (projectId: number | string, computoId?: number | string) =>
    computoId
      ? [...wbsKeys.summaries(), String(projectId), String(computoId)]
      : [...wbsKeys.summaries(), String(projectId)],
  visibility: (projectId: number | string) => [...wbsKeys.all, 'visibility', String(projectId)],
}

/**
 * Stale time configuration
 */
export const wbsStaleTime = {
  tree: 10 * 60 * 1000, // 10 minutes - trees don't change often
  summary: 5 * 60 * 1000, // 5 minutes
  visibility: 15 * 60 * 1000, // 15 minutes - visibility rarely changes
}

/**
 * Get WBS tree structure
 * @param projectId - Project ID
 * @param computoId - Optional computo/estimate ID
 */
export const useWbsTree = (
  projectId: MaybeRef<number | string | null | undefined>,
  computoId?: MaybeRef<number | string | null | undefined>
) => {
  const pId = computed(() => {
    const val = unref(projectId)
    return val ? String(val) : null
  })

  const cId = computed(() => {
    const val = unref(computoId)
    return val ? String(val) : null
  })

  return useQuery({
    queryKey: computed(() => wbsKeys.tree(pId.value!, cId.value ?? undefined)),
    queryFn: () => api.getWbsTree(pId.value!, cId.value ?? undefined),
    enabled: computed(() => !!pId.value),
    staleTime: wbsStaleTime.tree,
  })
}

/**
 * Get WBS summary/statistics
 */
export const useWbsSummary = (
  projectId: MaybeRef<number | string | null | undefined>,
  computoId?: MaybeRef<number | string | null | undefined>
) => {
  const pId = computed(() => {
    const val = unref(projectId)
    return val ? String(val) : null
  })

  const cId = computed(() => {
    const val = unref(computoId)
    return val ? String(val) : null
  })

  return useQuery({
    queryKey: computed(() => wbsKeys.summary(pId.value!, cId.value ?? undefined)),
    queryFn: () => api.getWbsSummary(pId.value!, cId.value ?? undefined),
    enabled: computed(() => !!pId.value),
    staleTime: wbsStaleTime.summary,
  })
}

/**
 * Get WBS visibility configuration
 */
export const useWbsVisibility = (projectId: MaybeRef<number | string | null | undefined>) => {
  const pId = computed(() => {
    const val = unref(projectId)
    return val ? String(val) : null
  })

  return useQuery({
    queryKey: computed(() => wbsKeys.visibility(pId.value!)),
    queryFn: () => api.getWbsVisibility(pId.value!),
    enabled: computed(() => !!pId.value),
    staleTime: wbsStaleTime.visibility,
  })
}

/**
 * Update WBS visibility configuration
 */
export const useUpdateWbsVisibility = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      visibility,
    }: {
      projectId: string | number
      visibility: Record<string, boolean>
    }) => api.updateWbsVisibility(projectId, visibility),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: wbsKeys.visibility(variables.projectId) })
      // Also invalidate tree as visibility affects it
      queryClient.invalidateQueries({ queryKey: wbsKeys.trees() })
      toast.success('Visibilità WBS aggiornata')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Errore durante l\'aggiornamento della visibilità WBS')
    },
  })
}

/**
 * Upload WBS data (project estimate or returns)
 */
export const useUploadWbs = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      file,
      type,
    }: {
      projectId: string | number
      file: File
      type: 'project' | 'return'
    }) => api.uploadWbs(projectId, file, type),
    onSuccess: (result, variables) => {
      // Invalidate all WBS-related queries for this project
      queryClient.invalidateQueries({ queryKey: wbsKeys.trees() })
      queryClient.invalidateQueries({ queryKey: wbsKeys.summaries() })
      toast.success(`WBS ${variables.type === 'project' ? 'progetto' : 'ritorno'} caricato con successo`)
      return result
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Errore durante il caricamento WBS'
      toast.error(message)
    },
  })
}


