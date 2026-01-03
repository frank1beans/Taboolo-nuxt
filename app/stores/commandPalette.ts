import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  CommandPaletteFavoriteEntry,
  CommandPaletteHistoryEntry,
  CommandPaletteItem,
} from '~/types/command-palette'

const MAX_HISTORY = 12

/**
 * Command Palette Store
 * - Tracks open state, query, history, and favorites.
 * - Favorites are static for now, but can be managed later via toggleFavorite.
 */
export const useCommandPaletteStore = defineStore('commandPalette', () => {
  const isOpen = ref(false)
  const query = ref('')
  const lastQuery = ref('')

  const history = ref<CommandPaletteHistoryEntry[]>([])
  const favorites = ref<CommandPaletteFavoriteEntry[]>([
    {
      id: 'action:project.create',
      kind: 'action',
      label: 'Nuovo progetto',
      description: 'Crea un nuovo progetto',
      category: 'Preferiti',
      icon: 'i-heroicons-plus',
      actionId: 'project.create',
      keywords: ['progetto', 'crea', 'nuovo'],
    },
    {
      id: 'page:/projects',
      kind: 'page',
      label: 'Progetti',
      description: 'Vai alla lista progetti',
      category: 'Preferiti',
      icon: 'i-heroicons-folder',
      route: '/projects',
      keywords: ['progetti', 'dashboard'],
    },
  ])

  const openPalette = (seedQuery?: string) => {
    isOpen.value = true
    query.value = seedQuery ?? lastQuery.value
  }

  const closePalette = (options: { clearQuery?: boolean } = {}) => {
    isOpen.value = false
    if (options.clearQuery) {
      query.value = ''
      lastQuery.value = ''
    }
  }

  const setQuery = (value: string) => {
    query.value = value
    lastQuery.value = value
  }

  const recordHistory = (item: CommandPaletteItem) => {
    const { score, ...rest } = item
    const entry: CommandPaletteHistoryEntry = {
      ...rest,
      lastUsedAt: Date.now(),
    }

    const next = [entry, ...history.value.filter((existing) => existing.id !== item.id)]
    history.value = next.slice(0, MAX_HISTORY)
  }

  const clearHistory = () => {
    history.value = []
  }

  const toggleFavorite = (item: CommandPaletteItem) => {
    const existingIndex = favorites.value.findIndex((fav) => fav.id === item.id)
    if (existingIndex >= 0) {
      favorites.value.splice(existingIndex, 1)
      return
    }
    const { score, ...rest } = item
    favorites.value.unshift({ ...rest, category: 'Preferiti' })
  }

  const recentItems = computed(() => history.value)

  return {
    isOpen,
    query,
    history,
    favorites,
    recentItems,
    openPalette,
    closePalette,
    setQuery,
    recordHistory,
    clearHistory,
    toggleFavorite,
  }
})
