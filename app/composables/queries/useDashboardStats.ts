import { useQuery } from '@tanstack/vue-query'
import { api } from '@/lib/api-client'
import { queryKeys } from '@/lib/constants'

export const useDashboardStats = () => {
  return useQuery({
    queryKey: queryKeys.dashboardStats(),
    queryFn: () => api.getDashboardStats(),
    staleTime: 60 * 1000,
  })
}
