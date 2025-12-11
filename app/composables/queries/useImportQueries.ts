import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { computed, unref, type MaybeRef } from 'vue'
import { api } from '~/lib/api-client'
import { toast } from 'vue-sonner'

type ColumnMappingConfig = Record<string, unknown>
type ImportOptions = Record<string, unknown>

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

/**
 * Query key factory for import queries
 */
export const importKeys = {
  all: ['import'] as const,
  configs: (projectId: number | string) => [...importKeys.all, 'configs', String(projectId)] as const,
  config: (projectId: number | string, configId: number | string) =>
    [...importKeys.all, 'config', String(projectId), String(configId)] as const,
  status: (importId: number | string) => [...importKeys.all, 'status', String(importId)] as const,
}

/**
 * Stale time configuration
 */
export const importStaleTime = {
  configs: 10 * 60 * 1000, // 10 minutes - configs rarely change
  status: 1 * 1000, // 1 second - status changes frequently during import
}

/**
 * Get saved import configurations for a project
 */
export const useImportConfigs = (projectId: MaybeRef<number | string | null | undefined>) => {
  const pId = computed(() => {
    const val = unref(projectId)
    return val ? String(val) : null
  })

  return useQuery({
    queryKey: computed(() => importKeys.configs(pId.value!)),
    queryFn: () => api.listImportConfigs({ projectId: pId.value! }),
    enabled: computed(() => !!pId.value),
    staleTime: importStaleTime.configs,
  })
}

/**
 * Get import status (for polling during import)
 */
export const useImportStatus = (importId: MaybeRef<number | string | null | undefined>) => {
  const iId = computed(() => {
    const val = unref(importId)
    return val ? String(val) : null
  })

  return useQuery({
    queryKey: computed(() => importKeys.status(iId.value!)),
    queryFn: () => api.getImportStatus(iId.value!),
    enabled: computed(() => !!iId.value),
    staleTime: importStaleTime.status,
    refetchInterval: (data) => {
      // Poll every 2 seconds if import is in progress
      if (data?.status === 'pending' || data?.status === 'processing') {
        return 2000
      }
      return false // Stop polling when complete
    },
  })
}

/**
 * Create/save import configuration
 */
export const useCreateImportConfig = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      config,
    }: {
      projectId: string | number
      config: {
        name: string
        mode: 'MC' | 'LC'
        column_mapping: ColumnMappingConfig
        options?: ImportOptions
      }
    }) => api.createImportConfig(config, { projectId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: importKeys.configs(variables.projectId) })
      toast.success('Configurazione salvata con successo')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Errore durante il salvataggio della configurazione'))
    },
  })
}

/**
 * Execute import (single enterprise)
 */
export const useExecuteImport = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      file,
      config,
    }: {
      projectId: string | number
      file: File
      config: {
        mode: 'MX' | 'LX'
        round?: string
        enterprise?: string
        sheetName?: string
        column_mapping: ColumnMappingConfig
        options?: ImportOptions
      }
    }) => {
      // Map config to api.uploadBidOffer params
      const codeColumns = config.column_mapping['code'] ? [config.column_mapping['code']] : []
      const descriptionColumns = config.column_mapping['description'] ? [config.column_mapping['description']] : []
      const priceColumn = config.column_mapping['price']
      const quantityColumn = config.column_mapping['quantity']
      
      return api.uploadBidOffer(projectId, {
        file,
        company: config.enterprise || 'Unknown',
        roundMode: config.round ? 'new' : 'auto',
        roundNumber: null, 
        discipline: config.options?.discipline,
        sheetName: config.sheetName || 'Sheet1',
        codeColumns,
        descriptionColumns,
        priceColumn,
        quantityColumn,
        mode: config.mode === 'MX' ? 'mc' : 'lc',
      })
    },
    onSuccess: (result, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['estimates', 'list', String(variables.projectId)] })
      queryClient.invalidateQueries({ queryKey: ['wbs', 'tree'] })
      queryClient.invalidateQueries({ queryKey: ['analysis'] })
      toast.success('Import completato con successo')
      return result
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Errore durante l\'import'))
    },
  })
}

/**
 * Execute batch import (multiple enterprises from single file)
 */
export const useExecuteBatchImport = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      file,
      empresaConfigs,
    }: {
      projectId: string | number
      file: File
      empresaConfigs: Array<{
        enterprise: string
        sheet?: string
        round?: string
        column_mapping: ColumnMappingConfig
      }>
    }) => {
      // Map to api.uploadOffersBatchSingleFile params
      const companiesConfig = empresaConfigs.map(c => ({
        company_name: c.enterprise,
        price_column: c.column_mapping['price'],
        quantity_column: c.column_mapping['quantity'],
        round_mode: 'new' as const,
        round_number: null,
      }))

      // Use first config for common columns (assumption)
      const firstConfig = empresaConfigs[0]
      const codeColumns = firstConfig?.column_mapping['code'] ? [firstConfig.column_mapping['code']] : []
      const descriptionColumns = firstConfig?.column_mapping['description'] ? [firstConfig.column_mapping['description']] : []

      return api.uploadOffersBatchSingleFile(projectId, {
        file,
        companiesConfig,
        codeColumns,
        descriptionColumns,
      })
    },
    onSuccess: (result, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['estimates', 'list', String(variables.projectId)] })
      queryClient.invalidateQueries({ queryKey: ['wbs', 'tree'] })
      queryClient.invalidateQueries({ queryKey: ['analysis'] })

      // Show success/failure summary
      if (result.success_count > 0) {
        toast.success(`${result.success_count} import completati con successo`)
      }
      if (result.failed_count > 0) {
        toast.error(`${result.failed_count} import falliti`)
      }

      return result
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Errore durante il batch import'))
    },
  })
}

/**
 * Import SIX file
 */
export const useImportSix = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      projectId,
      file,
      options,
    }: {
      projectId: string | number
      file: File
      options?: {
        round?: string
        enterprise?: string
      }
    }) => api.importSixFile(projectId, file, options),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['estimates', 'list', String(variables.projectId)] })
      queryClient.invalidateQueries({ queryKey: ['wbs', 'tree'] })
      toast.success('File SIX importato con successo')
      return result
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Errore durante l\'import del file SIX'))
    },
  })
}
