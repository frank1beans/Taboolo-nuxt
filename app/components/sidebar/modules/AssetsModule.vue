<script setup lang="ts">
import { ref, computed, watch, unref, type Ref } from 'vue'
import type { TreeNode } from '~/composables/useProjectTree'

type MaybeRef<T> = T | Ref<T>

type NodeMeta = {
  type?: string
  subtitle?: string
  hint?: string
}

type NavigationNode = TreeNode & {
  meta?: NodeMeta
  defaultOpen?: boolean
}

const props = withDefaults(defineProps<{
  nodes?: MaybeRef<TreeNode[]>
  activeNodeId?: MaybeRef<string | null>
  hasProject?: MaybeRef<boolean>
  loading?: MaybeRef<boolean>
}>(), {
  nodes: () => [],
  activeNodeId: null,
  hasProject: false,
  loading: false,
})

const expandedState = ref<Record<string, boolean>>({})
const userToggled = ref(false)

const resolvedNodes = computed<NavigationNode[]>(() => (unref(props.nodes) ?? []) as NavigationNode[])
const resolvedActiveNodeId = computed(() => unref(props.activeNodeId) ?? null)
const resolvedHasProject = computed(() => Boolean(unref(props.hasProject)))
const resolvedLoading = computed(() => Boolean(unref(props.loading)))

const typeLabels: Record<string, string> = {
  project: 'Progetto',
  estimate: 'Preventivo',
  'estimate-section': 'Preventivo',
  'estimate-detail': 'Dettaglio',
  'estimate-worklist': 'Lavorazioni',
  tenders: 'Offerte',
  round: 'Gara',
  company: 'Impresa',
  'offer-detail': 'Offerta',
  'offer-worklist': 'Offerta',
  comparison: 'Confronto',
}

const sanitizeTo = (to?: string) => {
  if (!to) return undefined
  if (to.includes('/null') || to.includes('/undefined')) return undefined
  return to
}

const getNodeMeta = (node?: NavigationNode | null) => {
  if (!node) return null
  const explicit = node.meta ?? {}
  const inferredType = explicit.type ?? node.id.split(':')[0]
  return {
    type: inferredType,
    subtitle: explicit.subtitle ?? typeLabels[inferredType],
    hint: explicit.hint,
  }
}

const getSecondaryLabel = (node: NavigationNode, depth: number) => {
  const meta = getNodeMeta(node)
  if (!meta?.subtitle) return undefined
  if (node.id === resolvedActiveNodeId.value) return meta.subtitle
  if (depth <= 1) return meta.subtitle
  if (node.children?.length && depth <= 2) return meta.subtitle
  return undefined
}

const findNodeById = (nodes: NavigationNode[], targetId?: string | null): NavigationNode | null => {
  if (!targetId) return null
  for (const node of nodes) {
    if (node.id === targetId) return node
    if (node.children?.length) {
      const found = findNodeById(node.children as NavigationNode[], targetId)
      if (found) return found
    }
  }
  return null
}

const findPath = (nodes: NavigationNode[], targetId?: string | null, trail: string[] = []): string[] => {
  if (!targetId) return []
  for (const node of nodes) {
    const nextTrail = [...trail, node.id]
    if (node.id === targetId) return nextTrail
    if (node.children?.length) {
      const result = findPath(node.children as NavigationNode[], targetId, nextTrail)
      if (result.length) return result
    }
  }
  return []
}

const collectNodeIds = (nodes: NavigationNode[], ids: Set<string>) => {
  nodes.forEach((node) => {
    ids.add(node.id)
    if (node.children?.length) collectNodeIds(node.children as NavigationNode[], ids)
  })
}

const collectDefaultOpenIds = (nodes: NavigationNode[], ids: Set<string>) => {
  nodes.forEach((node) => {
    if (node.defaultOpen) ids.add(node.id)
    if (node.children?.length) collectDefaultOpenIds(node.children as NavigationNode[], ids)
  })
}

const countNodes = (nodes: NavigationNode[]): number => {
  return nodes.reduce((total, node) => {
    const childrenCount = node.children?.length ? countNodes(node.children as NavigationNode[]) : 0
    return total + 1 + childrenCount
  }, 0)
}

const activePathIds = computed(() => new Set(findPath(resolvedNodes.value, resolvedActiveNodeId.value)))
const totalNodeCount = computed(() => countNodes(resolvedNodes.value))
const shouldAutoCollapse = computed(() => totalNodeCount.value >= 18)

const processNodes = (nodes: NavigationNode[], activePath: Set<string>) => {
  const items: Array<{ node: NavigationNode; depth: number; inActivePath: boolean; secondaryLabel?: string }> = []
  const traverse = (nodes: NavigationNode[], depth: number) => {
    nodes.forEach((node) => {
      items.push({
        node: { ...node, to: sanitizeTo(node.to) },
        depth,
        inActivePath: activePath.has(node.id),
        secondaryLabel: getSecondaryLabel(node, depth),
      })
      if (node.children?.length && isExpanded(node.id)) {
        traverse(node.children as NavigationNode[], depth + 1)
      }
    })
  }
  traverse(nodes, 0)
  return items
}

const visibleNodes = computed(() => processNodes(resolvedNodes.value, activePathIds.value))

const toggleNode = (nodeId: string) => {
  userToggled.value = true
  expandedState.value[nodeId] = !isExpanded(nodeId)
}

const isExpanded = (nodeId: string) => expandedState.value[nodeId] !== false

const syncExpandedState = (targetId?: string | null) => {
  const nextState = { ...expandedState.value }
  const activePath = findPath(resolvedNodes.value, targetId)
  const defaultOpenIds = new Set<string>()
  collectDefaultOpenIds(resolvedNodes.value, defaultOpenIds)

  activePath.forEach((id) => {
    nextState[id] = true
  })

  if (!userToggled.value) {
    defaultOpenIds.forEach((id) => {
      nextState[id] = true
    })

    if (shouldAutoCollapse.value) {
      const allIds = new Set<string>()
      collectNodeIds(resolvedNodes.value, allIds)
      const keepOpen = new Set([...activePath, ...defaultOpenIds])
      allIds.forEach((id) => {
        if (!keepOpen.has(id)) nextState[id] = false
      })
    }
  }

  expandedState.value = nextState
}

watch(
  [resolvedNodes, resolvedActiveNodeId],
  ([nodes, activeId], [prevNodes]) => {
    const prevRootId = prevNodes?.[0]?.id ?? null
    const nextRootId = nodes?.[0]?.id ?? null
    if (prevRootId !== nextRootId) {
      userToggled.value = false
      expandedState.value = {}
    }
    syncExpandedState(activeId)
  },
  { immediate: true, deep: true },
)

const activeNode = computed(() => findNodeById(resolvedNodes.value, resolvedActiveNodeId.value))
const contextTitle = computed(() => resolvedHasProject.value ? 'Vista Preventivi' : '')
const contextSubtitle = computed(() => {
  if (!resolvedHasProject.value) return ''
  const node = activeNode.value
  if (!node) return 'Seleziona un preventivo per aggiornare il contenuto centrale.'
  const metaType = getNodeMeta(node)?.type
  if (metaType === 'project') {
    return `Progetto: ${node.label}. Apri un preventivo per la vista Preventivi.`
  }
  return `Selezione: ${node.label}`
})

const hasChildren = (node: NavigationNode) => Boolean(node.children?.length)
</script>

<template>
  <SidebarModule title="Assets" icon="heroicons:folder-open" hide-header>
    <div class="space-y-2">
      <!-- Loading State -->
      <div v-if="resolvedLoading" class="px-2 py-3">
        <div class="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
          <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
          Caricamento struttura...
        </div>
        <div class="mt-3 space-y-2 animate-pulse">
          <div class="h-2 rounded bg-[hsl(var(--muted))/0.5] w-3/4"/>
          <div class="h-2 rounded bg-[hsl(var(--muted))/0.5] w-5/6"/>
          <div class="h-2 rounded bg-[hsl(var(--muted))/0.5] w-2/3"/>
        </div>
      </div>

      <!-- No Project State -->
      <div v-else-if="!resolvedHasProject" class="text-center py-6">
        <div class="w-10 h-10 mx-auto rounded-full bg-[hsl(var(--muted))/0.5] flex items-center justify-center mb-3">
          <UIcon name="i-heroicons-folder-open" class="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
        </div>
        <p class="text-xs text-[hsl(var(--muted-foreground))] mb-3">
          Seleziona un progetto per visualizzare gli asset
        </p>
        <UButton to="/projects" color="primary" variant="soft" size="xs" block>Seleziona progetto</UButton>
      </div>

      <div v-else-if="!resolvedNodes.length" class="text-center py-6">
        <div class="w-10 h-10 mx-auto rounded-full bg-[hsl(var(--muted))/0.5] flex items-center justify-center mb-3">
          <UIcon name="i-heroicons-folder" class="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
        </div>
        <p class="text-xs text-[hsl(var(--muted-foreground))]">
          Nessun asset disponibile per questo progetto
        </p>
      </div>

      <!-- Tree Items -->
      <div v-else class="space-y-2">
        <div class="px-2">
          <p class="text-[11px] text-[hsl(var(--muted-foreground))] leading-tight">
            <span class="font-medium text-[hsl(var(--foreground))]">{{ contextTitle }}</span>
            <span v-if="contextSubtitle" class="block">{{ contextSubtitle }}</span>
          </p>
        </div>

        <ul class="space-y-0.5">
          <li v-for="item in visibleNodes" :key="item.node.id">
            <!-- Item Link -->
            <NuxtLink
              v-if="item.node.to"
              :to="item.node.to"
              class="group relative flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors outline-none select-none"
              :class="[
                item.node.id === resolvedActiveNodeId
                  ? 'bg-[hsl(var(--primary))/0.12] text-[hsl(var(--primary))] font-semibold'
                  : item.inActivePath
                    ? 'text-[hsl(var(--foreground))] font-medium hover:bg-[hsl(var(--muted))/0.35]'
                    : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))/0.35] hover:text-[hsl(var(--foreground))]'
              ]"
              :style="{ paddingLeft: `${item.depth * 12 + 10}px` }"
              :aria-current="item.node.id === resolvedActiveNodeId ? 'page' : undefined"
            >
              <span
                v-if="item.node.id === resolvedActiveNodeId"
                class="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-[hsl(var(--primary))]"
              />

              <div
                v-if="item.node.children?.length"
                class="w-5 h-5 flex items-center justify-center rounded-md flex-shrink-0 transition-colors cursor-pointer hover:bg-[hsl(var(--muted))/0.6]"
                role="button"
                :title="isExpanded(item.node.id) ? 'Riduci' : 'Espandi'"
                @click.stop.prevent="toggleNode(item.node.id)"
              >
                <UIcon
                  name="i-heroicons-chevron-right-20-solid"
                  class="w-3.5 h-3.5 transition-transform duration-200"
                  :class="isExpanded(item.node.id) ? 'rotate-90' : ''"
                />
              </div>
              <div v-else class="w-5 h-5 flex-shrink-0"/>

              <Icon
                v-if="item.node.icon"
                :name="item.node.icon"
                class="w-4 h-4 flex-shrink-0 transition-colors"
                :class="item.node.id === resolvedActiveNodeId
                  ? 'text-[hsl(var(--primary))]'
                  : item.inActivePath
                    ? 'text-[hsl(var(--foreground))]'
                    : 'text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))]'"
              />

              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="truncate">{{ item.node.label }}</span>
                  <span
                    v-if="item.node.count !== undefined"
                    class="shrink-0 rounded-full border border-[hsl(var(--border))] px-1.5 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]"
                  >
                    {{ item.node.count }}
                  </span>
                </div>
                <span
                  v-if="item.secondaryLabel"
                  class="block text-[11px] text-[hsl(var(--muted-foreground))] leading-tight truncate"
                >
                  {{ item.secondaryLabel }}
                </span>
              </div>
            </NuxtLink>

            <!-- Item Group (No Link) -->
            <div
              v-else
              class="group relative flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors select-none"
              :class="[
                hasChildren(item.node) ? 'cursor-pointer' : 'cursor-default',
                item.node.id === resolvedActiveNodeId
                  ? 'bg-[hsl(var(--primary))/0.12] text-[hsl(var(--primary))] font-semibold'
                  : item.inActivePath
                    ? 'text-[hsl(var(--foreground))] font-medium hover:bg-[hsl(var(--muted))/0.35]'
                    : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))/0.35] hover:text-[hsl(var(--foreground))]'
              ]"
              :style="{ paddingLeft: `${item.depth * 12 + 10}px` }"
              :role="hasChildren(item.node) ? 'button' : undefined"
              :aria-expanded="hasChildren(item.node) ? isExpanded(item.node.id) : undefined"
              @click="hasChildren(item.node) && toggleNode(item.node.id)"
            >
              <span
                v-if="item.node.id === resolvedActiveNodeId"
                class="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-[hsl(var(--primary))]"
              />

              <div
                v-if="item.node.children?.length"
                class="w-5 h-5 flex items-center justify-center rounded-md flex-shrink-0 transition-colors"
              >
                <UIcon
                  name="i-heroicons-chevron-right-20-solid"
                  class="w-3.5 h-3.5 transition-transform duration-200"
                  :class="isExpanded(item.node.id) ? 'rotate-90' : ''"
                />
              </div>
              <div v-else class="w-5 h-5 flex-shrink-0"/>

              <Icon
                v-if="item.node.icon"
                :name="item.node.icon"
                class="w-4 h-4 flex-shrink-0 transition-colors"
                :class="item.node.id === resolvedActiveNodeId
                  ? 'text-[hsl(var(--primary))]'
                  : item.inActivePath
                    ? 'text-[hsl(var(--foreground))]'
                    : 'text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))]'"
              />

              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="truncate">{{ item.node.label }}</span>
                  <span
                    v-if="item.node.count !== undefined"
                    class="shrink-0 rounded-full border border-[hsl(var(--border))] px-1.5 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]"
                  >
                    {{ item.node.count }}
                  </span>
                </div>
                <span
                  v-if="item.secondaryLabel"
                  class="block text-[11px] text-[hsl(var(--muted-foreground))] leading-tight truncate"
                >
                  {{ item.secondaryLabel }}
                </span>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </SidebarModule>
</template>
