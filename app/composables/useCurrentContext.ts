import { computed, ref, watch } from 'vue'
import type { Estimate, Project } from '~/composables/useProjectTree'

import { persistClient as persistClientStorage, restoreFromClient as restoreFromClientStorage } from '~/composables/context/useContextPersistence'

const currentProjectId = ref<string | null>(null)
const currentEstimateId = ref<string | null>(null)
const project = ref<Project | null>(null)
const estimate = ref<Estimate | null>(null)
const loading = ref(true)
const hydrated = ref(false)

const persistClient = () => {
  persistClientStorage(currentProjectId.value, currentEstimateId.value)
}

const restoreFromClient = () => {
  const restored = restoreFromClientStorage()
  if (restored) {
    currentProjectId.value = restored.currentProjectId
    currentEstimateId.value = restored.currentEstimateId
  }
}

const loadProjectContext = async (projectId: string | null) => {
  loading.value = true
  if (!projectId) {
    project.value = null
    estimate.value = null
    loading.value = false
    return
  }

  try {
    const ctx = await $fetch<Project>(`/api/projects/${projectId}/context`)
    project.value = ctx
    estimate.value = (ctx.estimates ?? []).find((est) => est.id === currentEstimateId.value) ?? null
    if (!estimate.value) {
      currentEstimateId.value = null
    }
  } catch (error) {
    console.error('Failed to load project context', error)
    project.value = null
    estimate.value = null
  } finally {
    loading.value = false
  }
}

const syncContext = async () => {
  await $fetch('/api/context/current', {
    method: 'PUT',
    body: {
      currentProjectId: currentProjectId.value,
      currentEstimateId: currentEstimateId.value,
    },
  })
  persistClient()
}

const setCurrentProject = async (projectId: string | null) => {
  currentProjectId.value = projectId
  currentEstimateId.value = null
  await syncContext()
  await loadProjectContext(projectId)
}

const setCurrentEstimate = async (estimateId: string | null) => {
  if (!project.value) return
  const exists = (project.value.estimates ?? []).find((est) => est.id === estimateId) ?? null
  currentEstimateId.value = exists ? estimateId : null
  estimate.value = exists ?? null
  await syncContext()
}

const hydrateFromApi = async () => {
  loading.value = true
  try {
    const response = await $fetch<{ currentProjectId: string | null; currentEstimateId: string | null }>(
      '/api/context/current',
    )
    currentProjectId.value = response.currentProjectId ?? null
    currentEstimateId.value = response.currentEstimateId ?? null

    if (!currentProjectId.value) {
      restoreFromClient()
    }

    await loadProjectContext(currentProjectId.value)
  } catch (error) {
    console.error('Failed to hydrate context from API', error)
    restoreFromClient()
    await loadProjectContext(currentProjectId.value)
  } finally {
    hydrated.value = true
    loading.value = false
    persistClient()
  }
}

watch(
  [currentProjectId, currentEstimateId],
  () => {
    if (process.client) persistClient()
  },
  { deep: true },
)

export const useCurrentContext = () => ({
  hydrated,
  loading,
  currentProjectId,
  currentEstimateId,
  currentProject: computed(() => project.value),
  currentEstimate: computed(() => estimate.value),
  setCurrentProject,
  setCurrentEstimate,
  hydrateFromApi,
  persistClient,
})
