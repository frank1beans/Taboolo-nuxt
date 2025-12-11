import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { computed, unref, type MaybeRef } from 'vue'
import { api } from '~/lib/api-client'
import { toast } from 'vue-sonner'

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

/**
 * Query key factory for estimate/computo queries
 */
export const estimateKeys = {
  all: ['estimates'] as const,
  lists: () => [...estimateKeys.all, 'list'] as const,
  list: (projectId: number | string) => [...estimateKeys.lists(), String(projectId)] as const,
  details: () => [...estimateKeys.all, 'detail'] as const,
  detail: (projectId: number | string, estimateId: number | string) =>
    [...estimateKeys.details(), String(projectId), String(estimateId)] as const,
}

/**
 * Stale time configuration
 */
export const estimateStaleTime = {
  list: 5 * 60 * 1000, // 5 minutes
  detail: 3 * 60 * 1000, // 3 minutes
}

/**
 * Get estimates list for a project
 */
export const useEstimates = (projectId: MaybeRef<number | string | null | undefined>) => {
  const pId = computed(() => {
    const val = unref(projectId)
    return val ? String(val) : null
  })

  return useQuery({
    queryKey: computed(() => estimateKeys.list(pId.value!)),
    queryFn: () => api.getProjectEstimates(pId.value!),
    enabled: computed(() => !!pId.value),
    staleTime: estimateStaleTime.list,
  })
}

/**
 * Get single estimate detail
 */
export const useEstimate = (
  projectId: MaybeRef<number | string | null | undefined>,
  estimateId: MaybeRef<number | string | null | undefined>
) => {
  const pId = computed(() => {
    const val = unref(projectId)
    return val ? String(val) : null
  })

  const eId = computed(() => {
    const val = unref(estimateId)
    return val ? String(val) : null
  })

  return useQuery({
    queryKey: computed(() => estimateKeys.detail(pId.value!, eId.value!)),
    queryFn: () => api.getEstimate(pId.value!, eId.value!),
    enabled: computed(() => !!pId.value && !!eId.value),
    staleTime: estimateStaleTime.detail,
  })
}

/**
 * Upload project estimate (computo progetto)
 */
export const useUploadEstimate = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      file,
      discipline,
      revision,
      isBaseline,
    }: {
      projectId: string | number
      file: File
      discipline?: string
      revision?: string
      isBaseline?: boolean
    }) => api.uploadProjectEstimate(projectId, file, { discipline, revision, isBaseline }),
    onSuccess: (result, variables) => {
      // Invalidate estimates list
      queryClient.invalidateQueries({ queryKey: estimateKeys.list(variables.projectId) })
      toast.success('Computo progetto caricato con successo')
      return result
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Errore durante il caricamento del computo'))
    },
  })
}

/**
 * Delete estimate
 */
export const useDeleteEstimate = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, estimateId }: { projectId: number | string; estimateId: number | string }) =>
      api.deleteEstimate(projectId, estimateId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: estimateKeys.list(variables.projectId) })
      queryClient.removeQueries({
        queryKey: estimateKeys.detail(variables.projectId, variables.estimateId),
      })
      toast.success('Preventivo eliminato con successo')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Errore durante l\'eliminazione del preventivo'))
    },
  })
}

/**
 * Set estimate as baseline
 */
export const useSetEstimateBaseline = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ projectId, estimateId }: { projectId: string | number; estimateId: string | number }) =>
      api.setEstimateBaseline(projectId, estimateId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: estimateKeys.list(variables.projectId) })
      queryClient.invalidateQueries({
        queryKey: estimateKeys.detail(variables.projectId, variables.estimateId),
      })
      toast.success('Preventivo impostato come baseline')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Errore durante l\'impostazione del baseline'))
    },
  })
}
