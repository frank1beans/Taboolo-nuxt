import type { Project } from '#types'
import { useActionsStore } from '~/stores/actions'
import type { Action, ChangeProjectStatusPayload } from '~/types/actions'
import { useCurrentContext } from '~/composables/useCurrentContext'

export default defineNuxtPlugin(() => {
  const actionsStore = useActionsStore()
  const { currentProject, currentProjectId, currentEstimateId, setProjectState } = useCurrentContext()

  const register = (action: Action) =>
    actionsStore.registerAction(action, { overwrite: true, owner: 'global' })

  register({
    id: 'navigation.projects',
    label: 'Vai ai Progetti',
    description: 'Apri elenco dei progetti',
    category: 'Navigazione',
    scope: 'global',
    icon: 'i-heroicons-folder',
    keywords: ['progetti', 'lista', 'dashboard'],
    handler: () => navigateTo('/projects'),
  })

  register({
    id: 'navigation.catalogs',
    label: 'Apri Listino Globale',
    description: 'Vai al catalogo globale',
    category: 'Navigazione',
    scope: 'global',
    icon: 'i-heroicons-rectangle-stack',
    keywords: ['listino', 'catalogo', 'prezzi'],
    handler: () => navigateTo('/catalogs'),
  })

  register({
    id: 'navigation.analytics',
    label: 'Apri Analytics',
    description: 'Vai alla pagina analytics globale',
    category: 'Navigazione',
    scope: 'global',
    icon: 'i-heroicons-chart-bar',
    keywords: ['analytics', 'statistiche'],
    handler: () => navigateTo('/analytics'),
  })

  register({
    id: 'navigation.priceEstimator',
    label: 'Apri Price Estimator',
    description: 'Vai allo strumento di stima prezzi',
    category: 'Navigazione',
    scope: 'global',
    icon: 'i-heroicons-calculator',
    keywords: ['stima', 'prezzi'],
    handler: () => navigateTo('/price-estimator'),
  })

  register({
    id: 'navigation.currentProject',
    label: 'Apri progetto attivo',
    description: 'Vai alla dashboard del progetto attuale',
    category: 'Navigazione',
    scope: 'project',
    icon: 'i-heroicons-folder-open',
    keywords: ['progetto', 'dashboard'],
    isEnabled: () => Boolean(currentProjectId.value),
    disabledReason: 'Nessun progetto attivo',
    handler: () => {
      if (!currentProjectId.value) return
      return navigateTo(`/projects/${currentProjectId.value}`)
    },
  })

  register({
    id: 'navigation.currentProjectAnalytics',
    label: 'Apri analytics progetto',
    description: 'Vai alla pagina analytics del progetto attuale',
    category: 'Navigazione',
    scope: 'project',
    icon: 'i-heroicons-chart-bar',
    keywords: ['analytics', 'progetto'],
    isEnabled: () => Boolean(currentProjectId.value),
    disabledReason: 'Nessun progetto attivo',
    handler: () => {
      if (!currentProjectId.value) return
      return navigateTo(`/projects/${currentProjectId.value}/analytics`)
    },
  })

  register({
    id: 'navigation.currentProjectImport',
    label: 'Importa offerte nel progetto',
    description: 'Vai alla pagina di import del progetto attuale',
    category: 'Navigazione',
    scope: 'project',
    icon: 'i-heroicons-arrow-down-tray',
    keywords: ['import', 'offerte', 'excel'],
    isEnabled: () => Boolean(currentProjectId.value),
    disabledReason: 'Nessun progetto attivo',
    handler: () => {
      if (!currentProjectId.value) return
      return navigateTo(`/projects/${currentProjectId.value}/import`)
    },
  })

  register({
    id: 'navigation.currentProjectConflicts',
    label: 'Apri centro conflitti',
    description: 'Vai ai conflitti del progetto attuale',
    category: 'Navigazione',
    scope: 'project',
    icon: 'i-heroicons-exclamation-triangle',
    keywords: ['conflitti', 'alert'],
    isEnabled: () => Boolean(currentProjectId.value),
    disabledReason: 'Nessun progetto attivo',
    handler: () => {
      if (!currentProjectId.value) return
      const query = currentEstimateId.value ? `?estimateId=${currentEstimateId.value}` : ''
      return navigateTo(`/projects/${currentProjectId.value}/conflicts${query}`)
    },
  })

  register({
    id: 'navigation.currentEstimate',
    label: 'Apri preventivo attivo',
    description: 'Vai al preventivo corrente',
    category: 'Navigazione',
    scope: 'estimate',
    icon: 'i-heroicons-document-text',
    keywords: ['preventivo', 'offerta'],
    isEnabled: () => Boolean(currentProjectId.value && currentEstimateId.value),
    disabledReason: 'Nessun preventivo attivo',
    handler: () => {
      if (!currentProjectId.value || !currentEstimateId.value) return
      return navigateTo(`/projects/${currentProjectId.value}/estimate/${currentEstimateId.value}`)
    },
  })

  register({
    id: 'navigation.currentEstimateComparison',
    label: 'Confronto preventivo attivo',
    description: 'Apri il confronto offerte del preventivo corrente',
    category: 'Navigazione',
    scope: 'estimate',
    icon: 'i-heroicons-arrows-right-left',
    keywords: ['confronto', 'offerte'],
    isEnabled: () => Boolean(currentProjectId.value && currentEstimateId.value),
    disabledReason: 'Nessun preventivo attivo',
    handler: () => {
      if (!currentProjectId.value || !currentEstimateId.value) return
      return navigateTo(`/projects/${currentProjectId.value}/estimate/${currentEstimateId.value}/comparison`)
    },
  })

  register({
    id: 'navigation.currentEstimatePricelist',
    label: 'Listino preventivo attivo',
    description: 'Apri il listino del preventivo corrente',
    category: 'Navigazione',
    scope: 'estimate',
    icon: 'i-heroicons-list-bullet',
    keywords: ['listino', 'preventivo'],
    isEnabled: () => Boolean(currentProjectId.value && currentEstimateId.value),
    disabledReason: 'Nessun preventivo attivo',
    handler: () => {
      if (!currentProjectId.value || !currentEstimateId.value) return
      return navigateTo(`/projects/${currentProjectId.value}/pricelist?estimateId=${currentEstimateId.value}`)
    },
  })

  register({
    id: 'project.changeStatus',
    label: 'Cambia stato progetto',
    description: 'Cambia lo stato del progetto',
    category: 'Progetti',
    scope: 'project',
    icon: 'i-heroicons-arrow-path',
    keywords: ['stato', 'progetto', 'status'],
    handler: async (payload: ChangeProjectStatusPayload) => {
      const projectId = payload.projectId ?? currentProject.value?.id
      if (!projectId) {
        console.warn('[actions] Missing project id for project.changeStatus')
        return undefined
      }

      const updated = await $fetch<Project>(`/api/projects/${projectId}`, {
        method: 'PUT',
        body: { status: payload.status },
      })

      if (currentProject.value && currentProject.value.id === projectId) {
        const merged = {
          ...currentProject.value,
          ...updated,
          estimates: currentProject.value.estimates ?? updated.estimates,
        }
        setProjectState(merged, currentEstimateId.value)
      }

      return updated
    },
  })
})
