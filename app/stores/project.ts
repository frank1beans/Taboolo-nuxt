import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface Project {
  id: string
  name: string
  code: string
  description?: string
  business_unit?: string
  status?: string
  estimates?: any[]
}

interface RawData {
  importId: string
  counts: {
    units: number
    priceLists: number
    groups: number
    products: number
    preventivi: number
    rilevazioni: number
  }
  units: any[]
  priceLists: any[]
  groups: any[]
  products: any[]
  preventivi: any[]
}

export const useProjectStore = defineStore('project', () => {
  const projects = ref<Project[]>([])
  const currentProject = ref<Project | null>(null)
  const rawData = ref<RawData | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const currentProjectId = computed(() => currentProject.value?.id || '')

  const fetchProjects = async () => {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<{ data: Project[] }>('/api/projects')
      projects.value = res.data || []
      if (!currentProject.value && projects.value.length) {
        currentProject.value = projects.value[0]
      }
    } catch (e: any) {
      error.value = e?.data?.message || e?.message || 'Errore nel recupero progetti'
    } finally {
      loading.value = false
    }
  }

  const fetchProject = async (id: string) => {
    if (!id) return
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<Project>(`/api/projects/${id}`)
      currentProject.value = res
    } catch (e: any) {
      error.value = e?.data?.message || e?.message || 'Errore nel recupero progetto'
    } finally {
      loading.value = false
    }
  }

  const fetchRawData = async (importId?: string) => {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<RawData>('/api/raw', {
        params: importId ? { importId } : undefined,
      })
      rawData.value = res
    } catch (e: any) {
      error.value = e?.data?.message || e?.message || 'Errore nel recupero dati raw'
    } finally {
      loading.value = false
    }
  }

  const stats = computed(() => ({
    preventivi: rawData.value?.counts.preventivi ?? 0,
    rilevazioni: rawData.value?.counts.rilevazioni ?? 0,
    prodotti: rawData.value?.counts.products ?? 0,
    wbs: rawData.value?.counts.groups ?? 0,
  }))

  return {
    projects,
    currentProject,
    currentProjectId,
    rawData,
    loading,
    error,
    stats,
    fetchProjects,
    fetchProject,
    fetchRawData,
  }
})

