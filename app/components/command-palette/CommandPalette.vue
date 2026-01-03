<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useActionsStore } from '~/stores/actions'
import { useCommandPaletteStore } from '~/stores/commandPalette'
import { useActionContext } from '~/composables/useActionContext'
import { useNavigation } from '~/composables/useNavigation'
import { useCurrentContext } from '~/composables/useCurrentContext'
import { useProjectStore } from '~/stores/project'
import CommandPalettePreview from '~/components/command-palette/CommandPalettePreview.vue'
import type { CommandPaletteItem, CommandPaletteSection } from '~/types/command-palette'

const router = useRouter()
const actionsStore = useActionsStore()
const paletteStore = useCommandPaletteStore()

const { isOpen, query, favorites, recentItems } = storeToRefs(paletteStore)
const queryModel = computed({
  get: () => query.value,
  set: (value: string) => paletteStore.setQuery(value),
})

const actionContext = useActionContext()
const { currentProject, currentEstimate } = useCurrentContext()
const { globalNodes } = useNavigation(currentProject, currentEstimate)

const projectStore = useProjectStore()
const { projects } = storeToRefs(projectStore)

const inputRef = ref<HTMLInputElement | null>(null)
const resultsRef = ref<HTMLDivElement | null>(null)
const activeIndex = ref(0)
const lastFocusedElement = ref<HTMLElement | null>(null)
const previousBodyOverflow = ref<string | null>(null)

const MAX_RESULTS = 50
const FAVORITES_PREFIX = '*'
const HISTORY_PREFIX = '#'

const queryMode = computed(() => {
  const trimmed = queryModel.value.trim()
  if (trimmed.startsWith(HISTORY_PREFIX)) return 'history'
  if (trimmed.startsWith(FAVORITES_PREFIX)) return 'favorites'
  return 'all'
})

const effectiveQuery = computed(() => {
  const trimmed = queryModel.value.trim()
  if (queryMode.value === 'history') return trimmed.slice(1).trim()
  if (queryMode.value === 'favorites') return trimmed.slice(1).trim()
  return trimmed
})

const normalizeIcon = (icon?: string) => {
  if (!icon) return 'i-heroicons-bolt'
  if (icon.startsWith('i-')) return icon
  if (icon.startsWith('heroicons:')) return `i-heroicons-${icon.replace('heroicons:', '')}`
  return icon
}

const tokenAliases: Record<string, string[]> = {
  proj: ['progetto', 'project', 'progetti'],
}

const normalizeToken = (value: string) => value.toLowerCase()

const isSubsequence = (needle: string, haystack: string) => {
  let index = 0
  for (const char of haystack) {
    if (char === needle[index]) index += 1
    if (index >= needle.length) return true
  }
  return needle.length === 0
}

const scoreText = (text: string, token: string) => {
  if (!text || !token) return 0
  if (text.startsWith(token)) return 4
  if (text.includes(token)) return 2
  if (isSubsequence(token, text)) return 1
  return 0
}

const scoreToken = (text: string, token: string) => {
  const variants = [token, ...(tokenAliases[token] || [])]
  return Math.max(...variants.map((variant) => scoreText(text, variant)))
}

const scoreItem = (item: CommandPaletteItem, q: string) => {
  const normalized = q.trim().toLowerCase()
  if (!normalized) return 0
  const tokens = normalized.split(/\s+/).filter(Boolean)
  const label = normalizeToken(item.label)
  const description = normalizeToken(item.description ?? '')
  const category = normalizeToken(item.category)
  const id = normalizeToken(item.id)
  const keywords = (item.keywords ?? []).map(normalizeToken)

  let score = 0
  for (const token of tokens) {
    let tokenScore = 0
    tokenScore = Math.max(tokenScore, scoreToken(label, token) * 3)
    tokenScore = Math.max(tokenScore, scoreToken(id, token) * 2)
    tokenScore = Math.max(tokenScore, scoreToken(category, token))
    tokenScore = Math.max(tokenScore, scoreToken(description, token))
    if (keywords.some((keyword) => keyword.includes(token))) tokenScore += 1
    if (tokenScore === 0) return 0
    score += tokenScore
  }
  return score
}

const baseActionItems = computed<CommandPaletteItem[]>(() => {
  const items = actionsStore.getPaletteItems('', actionContext.value, { includeDisabled: true })

  return items.map((item) => {
    const scopeBoost =
      item.action.scope === 'estimate' && actionContext.value.estimateId
        ? 2
        : item.action.scope === 'project' && actionContext.value.projectId
          ? 1
          : 0

    return {
      id: `action:${item.id}`,
      kind: 'action',
      label: item.label,
      description: item.description,
      category: item.category,
      icon: normalizeIcon(item.icon),
      shortcut: item.shortcut,
      keywords: [...(item.action.keywords ?? []), item.id, item.action.id],
      score: (item.score ?? 0) + scopeBoost,
      disabled: !item.enabled,
      disabledReason: item.disabledReason,
      actionId: item.id,
    }
  })
})

const basePageItems = computed<CommandPaletteItem[]>(() => {
  return globalNodes.value
    .filter((node) => node.to)
    .map((node) => ({
      id: `page:${node.to}`,
      kind: 'page',
      label: node.label,
      description: 'Apri pagina',
      category: 'Pagine',
      icon: normalizeIcon(node.icon),
      route: node.to,
      keywords: [node.label, node.to ?? ''],
      data: { route: node.to },
    }))
})

const baseEntityItems = computed<CommandPaletteItem[]>(() => {
  const items: CommandPaletteItem[] = []
  const project = currentProject.value
  const estimate = currentEstimate.value

  if (project) {
    items.push({
      id: `entity:project:${project.id}`,
      kind: 'entity',
      label: project.name || 'Progetto attivo',
      description: project.code ? `Codice ${project.code}` : 'Apri progetto',
      category: 'Progetti',
      icon: 'i-heroicons-folder-open',
      route: `/projects/${project.id}`,
      entityType: 'project',
      keywords: [project.name || '', project.code || ''],
      data: {
        code: project.code,
        status: project.status,
        projectName: project.name,
        route: `/projects/${project.id}`,
      },
    })
  }

  if (project?.estimates?.length) {
    project.estimates.slice(0, 6).forEach((est) => {
      if (!est.id) return
      if (estimate?.id === est.id) return
      items.push({
        id: `entity:estimate:${est.id}`,
        kind: 'entity',
        label: est.name || 'Preventivo',
        description: project.name ? `Progetto ${project.name}` : 'Preventivo',
        category: 'Preventivi',
        icon: 'i-heroicons-document-text',
        route: `/projects/${project.id}/estimate/${est.id}`,
        entityType: 'estimate',
        keywords: [est.name || '', project.name || ''],
        data: {
          projectName: project.name,
          estimateName: est.name,
          route: `/projects/${project.id}/estimate/${est.id}`,
        },
      })
    })
  }

  if (estimate && project?.id) {
    items.push({
      id: `entity:estimate:${estimate.id}`,
      kind: 'entity',
      label: estimate.name || 'Preventivo attivo',
      description: project.name ? `Progetto ${project.name}` : 'Preventivo attivo',
      category: 'Preventivi',
      icon: 'i-heroicons-document-check',
      route: `/projects/${project.id}/estimate/${estimate.id}`,
      entityType: 'estimate',
      keywords: [estimate.name || '', project.name || ''],
      data: {
        projectName: project.name,
        estimateName: estimate.name,
        route: `/projects/${project.id}/estimate/${estimate.id}`,
      },
    })
  }

  if (projects.value.length) {
    projects.value.slice(0, 6).forEach((proj) => {
      if (!proj?.id) return
      if (project?.id === proj.id) return
      items.push({
        id: `entity:project:${proj.id}`,
        kind: 'entity',
        label: proj.name || 'Progetto',
        description: proj.code ? `Codice ${proj.code}` : 'Apri progetto',
        category: 'Progetti',
        icon: 'i-heroicons-folder',
        route: `/projects/${proj.id}`,
        entityType: 'project',
        keywords: [proj.name || '', proj.code || ''],
        data: {
          code: proj.code,
          status: proj.status,
          projectName: proj.name,
          route: `/projects/${proj.id}`,
        },
      })
    })
  }

  return items
})

const filterAndScore = (items: CommandPaletteItem[], q: string) => {
  if (!q) {
    return items
  }
  return items
    .map((item) => {
      const matchScore = scoreItem(item, q)
      return { ...item, score: matchScore + (item.score ?? 0) }
    })
    .filter((item) => (item.score ?? 0) > 0)
}

const sortItems = (items: CommandPaletteItem[]) => {
  return [...items].sort((a, b) => {
    const scoreA = a.score ?? 0
    const scoreB = b.score ?? 0
    if (scoreA !== scoreB) return scoreB - scoreA
    return a.label.localeCompare(b.label)
  })
}

const actionAvailability = computed(() => {
  const map = new Map<string, { disabled?: boolean; disabledReason?: string }>()
  baseActionItems.value.forEach((item) => {
    if (!item.actionId) return
    map.set(item.actionId, {
      disabled: item.disabled,
      disabledReason: item.disabledReason,
    })
  })
  return map
})

const applyActionAvailability = (items: CommandPaletteItem[]) => {
  return items.map((item) => {
    if (item.kind !== 'action' || !item.actionId) return item
    const state = actionAvailability.value.get(item.actionId)
    if (!state) {
      return {
        ...item,
        disabled: true,
        disabledReason: item.disabledReason ?? 'Azione non disponibile',
      }
    }
    return {
      ...item,
      disabled: state.disabled,
      disabledReason: state.disabledReason ?? item.disabledReason,
    }
  })
}

const buildSection = (
  id: string,
  label: string,
  items: CommandPaletteItem[],
  usedIds: Set<string>,
) => {
  const filtered = items.filter((item) => !usedIds.has(item.id))
  if (!filtered.length) return null
  filtered.forEach((item) => usedIds.add(item.id))
  return { id, label, items: filtered }
}

const sections = computed<CommandPaletteSection[]>(() => {
  const usedIds = new Set<string>()
  const q = effectiveQuery.value
  const hasQuery = q.length > 0
  const result: CommandPaletteSection[] = []

  const actions = sortItems(filterAndScore(baseActionItems.value, q))
  const pages = sortItems(filterAndScore(basePageItems.value, q))
  const entities = sortItems(filterAndScore(baseEntityItems.value, q))
  const favs = sortItems(filterAndScore(applyActionAvailability(favorites.value), q))
  const recent = sortItems(filterAndScore(applyActionAvailability(recentItems.value), q))

  if (queryMode.value === 'favorites') {
    const favSection = buildSection('favorites', 'Preferiti', favs, usedIds)
    if (favSection) result.push(favSection)
    return result
  }

  if (queryMode.value === 'history') {
    const historySection = buildSection('history', 'Recenti', recent, usedIds)
    if (historySection) result.push(historySection)
    return result
  }

  if (!hasQuery) {
    const favSection = buildSection('favorites', 'Preferiti', favs, usedIds)
    if (favSection) result.push(favSection)

    const historySection = buildSection('history', 'Recenti', recent, usedIds)
    if (historySection) result.push(historySection)

    const actionSection = buildSection('actions', 'Azioni', actions.slice(0, 8), usedIds)
    if (actionSection) result.push(actionSection)

    const pageSection = buildSection('pages', 'Pagine', pages, usedIds)
    if (pageSection) result.push(pageSection)

    const entitySection = buildSection('entities', 'Entita', entities, usedIds)
    if (entitySection) result.push(entitySection)

    return result
  }

  const favSection = buildSection('favorites', 'Preferiti', favs, usedIds)
  if (favSection) result.push(favSection)

  const historySection = buildSection('history', 'Recenti', recent, usedIds)
  if (historySection) result.push(historySection)

  const actionSection = buildSection('actions', 'Azioni', actions, usedIds)
  if (actionSection) result.push(actionSection)

  const pageSection = buildSection('pages', 'Pagine', pages, usedIds)
  if (pageSection) result.push(pageSection)

  const entitySection = buildSection('entities', 'Entita', entities, usedIds)
  if (entitySection) result.push(entitySection)

  let remaining = MAX_RESULTS
  return result
    .map((section) => {
      if (remaining <= 0) return null
      const items = section.items.slice(0, remaining)
      remaining -= items.length
      if (!items.length) return null
      return { ...section, items }
    })
    .filter((section): section is CommandPaletteSection => Boolean(section))
})

const indexedSections = computed(() => {
  let cursor = 0
  return sections.value.map((section) => ({
    ...section,
    items: section.items.map((item) => ({ item, index: cursor++ })),
  }))
})

const flatItems = computed(() =>
  indexedSections.value.flatMap((section) => section.items.map((entry) => entry.item)),
)

const activeItem = computed(() => flatItems.value[activeIndex.value] ?? null)

const ensureActiveIndex = () => {
  if (!flatItems.value.length) {
    activeIndex.value = 0
    return
  }
  if (activeIndex.value >= flatItems.value.length) {
    activeIndex.value = 0
  }
}

const setActiveIndex = (next: number) => {
  if (!flatItems.value.length) return
  const max = flatItems.value.length
  activeIndex.value = ((next % max) + max) % max
}

const scrollActiveIntoView = () => {
  nextTick(() => {
    const container = resultsRef.value
    if (!container) return
    const active = container.querySelector(`[data-index="${activeIndex.value}"]`) as HTMLElement | null
    active?.scrollIntoView({ block: 'nearest' })
  })
}

watch([flatItems, isOpen], () => {
  ensureActiveIndex()
  scrollActiveIntoView()
})

watch(activeIndex, () => {
  scrollActiveIntoView()
})

watch(effectiveQuery, () => {
  activeIndex.value = 0
})

watch(isOpen, (open) => {
  if (!import.meta.client) return
  if (open) {
    lastFocusedElement.value = document.activeElement as HTMLElement
    previousBodyOverflow.value = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    nextTick(() => {
      inputRef.value?.focus()
      inputRef.value?.select()
    })
  } else {
    document.body.style.overflow = previousBodyOverflow.value ?? ''
    lastFocusedElement.value?.focus?.()
  }
})

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const highlightParts = (text: string, q: string) => {
  const normalized = q.trim()
  if (!normalized) return [{ text, match: false }]
  const tokens = normalized.split(/\s+/).filter(Boolean)
  let parts: Array<{ text: string; match: boolean }> = [{ text, match: false }]

  tokens.forEach((token) => {
    const regex = new RegExp(`(${escapeRegExp(token)})`, 'ig')
    parts = parts.flatMap((part) => {
      if (part.match) return [part]
      return part.text
        .split(regex)
        .filter(Boolean)
        .map((segment) => ({
          text: segment,
          match: segment.toLowerCase() === token.toLowerCase(),
        }))
    })
  })

  return parts
}

const closePalette = () => {
  paletteStore.closePalette({ clearQuery: false })
}

const executeItem = async (item: CommandPaletteItem) => {
  if (item.disabled) return
  if (item.kind === 'action' && item.actionId) {
    await actionsStore.executeAction(item.actionId)
  } else if (item.route) {
    await router.push(item.route)
  }
  paletteStore.recordHistory(item)
  closePalette()
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    setActiveIndex(activeIndex.value + 1)
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    setActiveIndex(activeIndex.value - 1)
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    const item = activeItem.value
    if (item) executeItem(item)
    return
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    closePalette()
  }
}

const emptyStateMessage = computed(() => {
  if (queryMode.value === 'history') return 'Nessun elemento recente.'
  if (queryMode.value === 'favorites') return 'Nessun preferito.'
  if (!effectiveQuery.value) return 'Digita per cercare azioni, pagine o entita.'
  return 'Nessun risultato.'
})

</script>

<template>
  <Teleport to="body">
    <transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[120] flex items-start justify-center px-4 py-12"
      >
        <div class="absolute inset-0 bg-black/55 backdrop-blur-sm" @click="closePalette" />

        <div
          class="relative z-[125] w-full max-w-4xl rounded-[var(--card-radius)] shadow-2xl border bg-[hsl(var(--card))] border-[hsl(var(--border))] overflow-hidden"
        >
          <div class="px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
            <div class="flex items-center gap-3">
              <UIcon
                name="i-heroicons-magnifying-glass"
                class="w-4 h-4 text-[hsl(var(--muted-foreground))]"
              />
              <input
                ref="inputRef"
                v-model="queryModel"
                type="text"
                placeholder="Cerca azioni, pagine, entita... (# recenti, * preferiti)"
                class="w-full bg-transparent text-sm text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))] focus:outline-none"
                @keydown="handleKeydown"
              >
            </div>
          </div>

          <div class="flex min-h-[280px] max-h-[70vh]">
            <div ref="resultsRef" class="flex-1 overflow-y-auto">
              <div v-if="indexedSections.length === 0" class="px-4 py-10 text-sm text-center text-[hsl(var(--muted-foreground))]">
                {{ emptyStateMessage }}
              </div>

              <div v-for="section in indexedSections" :key="section.id">
                <div class="px-4 py-2 text-[10px] uppercase tracking-wider font-semibold text-[hsl(var(--muted-foreground))] bg-[hsl(var(--secondary))]">
                  {{ section.label }}
                </div>
                <div>
                  <button
                    v-for="entry in section.items"
                    :key="entry.item.id"
                    type="button"
                    class="w-full text-left px-4 py-2.5 flex items-start gap-3 border-b border-[hsl(var(--border))] transition"
                    :class="[
                      entry.index === activeIndex
                        ? 'bg-[hsl(var(--muted))]'
                        : 'hover:bg-[hsl(var(--muted)/0.6)]',
                      entry.item.disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
                    ]"
                    :data-index="entry.index"
                    :disabled="entry.item.disabled"
                    @mouseenter="activeIndex = entry.index"
                    @click="executeItem(entry.item)"
                  >
                    <UIcon :name="normalizeIcon(entry.item.icon)" class="w-4 h-4 mt-0.5 text-[hsl(var(--muted-foreground))]" />
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-medium text-[hsl(var(--foreground))] truncate">
                          <span
                            v-for="(part, idx) in highlightParts(entry.item.label, effectiveQuery)"
                            :key="`${entry.item.id}-${idx}`"
                            :class="part.match ? 'text-[hsl(var(--primary))]' : ''"
                          >
                            {{ part.text }}
                          </span>
                        </span>
                        <span class="text-[10px] uppercase tracking-wide text-[hsl(var(--muted-foreground))]">
                          {{ entry.item.category }}
                        </span>
                      </div>
                      <div v-if="entry.item.description" class="text-xs text-[hsl(var(--muted-foreground))] truncate">
                        {{ entry.item.description }}
                      </div>
                      <div v-if="entry.item.disabledReason" class="text-[11px] text-[hsl(var(--warning))]">
                        {{ entry.item.disabledReason }}
                      </div>
                    </div>
                    <div v-if="entry.item.shortcut" class="text-[10px] text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                      {{ entry.item.shortcut }}
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div class="hidden lg:block w-72 border-l border-[hsl(var(--border))] bg-[hsl(var(--card))]">
              <CommandPalettePreview :item="activeItem" />
            </div>
          </div>

          <div class="px-4 py-2 border-t border-[hsl(var(--border))] bg-[hsl(var(--secondary))] text-[11px] text-[hsl(var(--muted-foreground))] flex items-center justify-between">
            <span>Invio per eseguire, Esc per chiudere</span>
            <span>Freccia su/giu per navigare</span>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 140ms ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
