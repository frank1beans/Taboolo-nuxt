import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { computed, unref, type MaybeRef } from 'vue'
import { api } from '@/lib/api-client'
import { toast } from 'vue-sonner'

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

/**
 * Query key factory for price catalog queries
 */
export const priceCatalogKeys = {
  all: ['price-catalog'] as const,
  lists: () => [...priceCatalogKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...priceCatalogKeys.lists(), filters] as const,
  global: (filters?: Record<string, unknown>) => [...priceCatalogKeys.lists(), 'global', filters] as const,
  project: (projectId: number | string, filters?: Record<string, unknown>) =>
    [...priceCatalogKeys.lists(), 'project', String(projectId), filters] as const,
  item: (id: number | string) => [...priceCatalogKeys.all, 'item', String(id)] as const,
  search: (query: string) => [...priceCatalogKeys.all, 'search', query] as const,
}

/**
 * Stale time configuration
 */
export const priceCatalogStaleTime = {
  list: 10 * 60 * 1000, // 10 minutes
  item: 15 * 60 * 1000, // 15 minutes
  search: 5 * 60 * 1000, // 5 minutes
}

/**
 * Get global price catalog (all projects)
 */
export const usePriceCatalog = (filters?: MaybeRef<Record<string, unknown> | undefined>) => {
  const activeFilters = computed(() => unref(filters))

  return useQuery({
    queryKey: computed(() => priceCatalogKeys.global(activeFilters.value)),
    queryFn: () => api.getPriceCatalog(activeFilters.value),
    staleTime: priceCatalogStaleTime.list,
  })
}

/**
 * Get project-specific price catalog
 */
export const useProjectPriceCatalog = (
  projectId: MaybeRef<number | string | null | undefined>,
  filters?: MaybeRef<Record<string, unknown> | undefined>
) => {
  const pId = computed(() => {
    const val = unref(projectId)
    return val ? String(val) : null
  })

  const activeFilters = computed(() => unref(filters))

  return useQuery({
    queryKey: computed(() => priceCatalogKeys.project(pId.value!, activeFilters.value)),
    queryFn: () => api.getProjectPriceCatalog(pId.value!, activeFilters.value),
    enabled: computed(() => !!pId.value),
    staleTime: priceCatalogStaleTime.list,
  })
}

/**
 * Get single price catalog item
 */
export const usePriceItem = (id: MaybeRef<number | string | null | undefined>) => {
  const itemId = computed(() => {
    const val = unref(id)
    return val ? String(val) : null
  })

  return useQuery({
    queryKey: computed(() => priceCatalogKeys.item(itemId.value!)),
    queryFn: () => api.getPriceItem(itemId.value!),
    enabled: computed(() => !!itemId.value),
    staleTime: priceCatalogStaleTime.item,
  })
}

/**
 * Search price catalog (keyword search - NO semantic/NLP)
 */
export const useSearchPrices = (query: MaybeRef<string>) => {
  const searchQuery = computed(() => unref(query))

  return useQuery({
    queryKey: computed(() => priceCatalogKeys.search(searchQuery.value)),
    queryFn: () => api.searchPriceCatalog(searchQuery.value),
    enabled: computed(() => searchQuery.value.length >= 2), // Min 2 chars
    staleTime: priceCatalogStaleTime.search,
  })
}

/**
 * Update price manually
 */
export const useUpdatePrice = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      itemId,
      price,
      notes,
    }: {
      itemId: number
      price: number
      notes?: string
    }) => api.updatePriceManually(itemId, price, notes),
    onSuccess: (_, variables) => {
      // Invalidate all price catalog queries
      queryClient.invalidateQueries({ queryKey: priceCatalogKeys.lists() })
      queryClient.invalidateQueries({ queryKey: priceCatalogKeys.item(variables.itemId) })
      toast.success('Prezzo aggiornato con successo')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Errore durante l\'aggiornamento del prezzo'))
    },
  })
}

/**
 * Bulk update prices
 */
export const useBulkUpdatePrices = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (updates: Array<{ itemId: number; price: number; notes?: string }>) =>
      api.bulkUpdatePrices(updates),
    onSuccess: () => {
      // Invalidate all price catalog queries
      queryClient.invalidateQueries({ queryKey: priceCatalogKeys.lists() })
      toast.success('Prezzi aggiornati con successo')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Errore durante l\'aggiornamento dei prezzi'))
    },
  })
}
