import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useCurrentContext } from '~/composables/useCurrentContext'
import type { ActionContext } from '~/types/actions'

export const useActionContext = (extras?: () => Partial<ActionContext>) => {
  const route = useRoute()
  const { currentProjectId, currentEstimateId } = useCurrentContext()

  return computed<ActionContext>(() => ({
    routePath: route.path,
    routeName: route.name ? String(route.name) : null,
    projectId: currentProjectId.value,
    estimateId: currentEstimateId.value,
    ...(extras ? extras() : {}),
  }))
}
