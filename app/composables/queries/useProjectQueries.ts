import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { computed, unref, type MaybeRef } from 'vue'
import { api } from '@/lib/api-client'
import { toast } from 'vue-sonner'

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

/**
 * Query key factory for project-related queries
 * Follows best practices for cache invalidation and updates
 */
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: number | string) => [...projectKeys.details(), String(id)] as const,
  preferences: (id: number | string) => [...projectKeys.detail(id), 'preferences'] as const,
  documents: (id: number | string) => [...projectKeys.detail(id), 'documents'] as const,
}

/**
 * Stale time configuration (in milliseconds)
 */
export const projectStaleTime = {
  list: 5 * 60 * 1000, // 5 minutes - lists don't change often
  detail: 3 * 60 * 1000, // 3 minutes - details might change
  preferences: 10 * 60 * 1000, // 10 minutes - preferences rarely change
}

/**
 * Get all projects list
 */
export const useProjects = () => {
  return useQuery({
    queryKey: projectKeys.list(),
    queryFn: () => api.listProjects(),
    staleTime: projectStaleTime.list,
  })
}

/**
 * Get single project detail by ID
 * @param id - Project ID (can be reactive ref)
 */
export const useProject = (id: MaybeRef<number | string | null | undefined>) => {
  const projectId = computed(() => {
    const val = unref(id)
    return val ? String(val) : null
  })

  return useQuery({
    queryKey: computed(() => projectKeys.detail(projectId.value!)),
    queryFn: () => api.getProject(projectId.value!),
    enabled: computed(() => !!projectId.value),
    staleTime: projectStaleTime.detail,
  })
}

/**
 * Get project preferences
 */
export const useProjectPreferences = (id: MaybeRef<number | string | null | undefined>) => {
  const projectId = computed(() => {
    const val = unref(id)
    return val ? String(val) : null
  })

  return useQuery({
    queryKey: computed(() => projectKeys.preferences(projectId.value!)),
    queryFn: () => api.getProjectPreferences(projectId.value!),
    enabled: computed(() => !!projectId.value),
    staleTime: projectStaleTime.preferences,
  })
}

/**
 * Create new project
 */
export const useCreateProject = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { name: string; code: string; description?: string | null; business_unit?: string | null; status?: ProjectStatus }) =>
      api.createProject(payload),
    onSuccess: () => {
      // Invalidate projects list to refetch
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
      toast.success('Progetto creato con successo')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Errore durante la creazione del progetto'))
    },
  })
}

/**
 * Update existing project
 */
export const useUpdateProject = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; name: string; code: string; description?: string | null; business_unit?: string | null; status?: ProjectStatus }) =>
      api.updateProject(id, payload),
    onSuccess: (_updatedProject, variables) => {
      // Invalidate both list and specific project detail
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.id) })
      toast.success('Progetto aggiornato con successo')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Errore durante l\'aggiornamento del progetto'))
    },
  })
}

/**
 * Delete project
 */
export const useDeleteProject = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.deleteProject(id),
    onSuccess: (_, deletedId) => {
      // Invalidate list
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
      // Remove from cache
      queryClient.removeQueries({ queryKey: projectKeys.detail(deletedId) })
      toast.success('Progetto eliminato con successo')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Errore durante l\'eliminazione del progetto'))
    },
  })
}

/**
 * Export project bundle (.mmcomm file)
 */
export const useExportProjectBundle = () => {
  return useMutation({
    mutationFn: (id: string) => api.exportProjectBundle(id),
    onSuccess: (result, projectId) => {
      // Download the blob as file
      const blob = result.blob || result
      const filename = result.filename || `project-${projectId}.mmcomm`
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Bundle esportato con successo')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Errore durante l\'esportazione del bundle'))
    },
  })
}

/**
 * Import project bundle (.mmcomm file)
 */
export const useImportProjectBundle = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => api.importProjectBundle(file),
    onSuccess: () => {
      // Invalidate projects list to show the new imported project
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
      toast.success('Bundle importato con successo')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Errore durante l\'importazione del bundle'))
    },
  })
}

/**
 * Update project preferences
 */
export const useUpdateProjectPreferences = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, preferences }: { id: string; preferences: Record<string, unknown> }) =>
      api.updateProjectPreferences(id, preferences),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.preferences(variables.id) })
      toast.success('Preferenze aggiornate con successo')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Errore durante l\'aggiornamento delle preferenze'))
    },
  })
}
