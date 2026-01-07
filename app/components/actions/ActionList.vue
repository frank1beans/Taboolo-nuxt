<script setup lang="ts">
import { computed } from 'vue'
import { useActionsStore } from '~/stores/actions'
import { useActionContext } from '~/composables/useActionContext'
import type { ActionContext, ActionScope, ActionPaletteItem } from '~/types/actions'

type LayoutMode = 'toolbar' | 'sidebar' | 'selection'

const props = withDefaults(defineProps<{
  actionIds?: string[]
  category?: string | string[]
  scope?: ActionScope | ActionScope[]
  layout?: LayoutMode
  primaryActionIds?: string[]
  showDisabled?: boolean
  selectionCount?: number
  contextExtras?: () => Partial<ActionContext>
}>(), {
  actionIds: undefined,
  category: undefined,
  scope: undefined,
  layout: 'toolbar',
  primaryActionIds: () => [],
  showDisabled: false,
  selectionCount: undefined,
  contextExtras: undefined,
})

const actionsStore = useActionsStore()

const actionContext = useActionContext(() => ({
  selectionCount: props.selectionCount,
  ...(props.contextExtras ? props.contextExtras() : {}),
}))

const normalizeToArray = <T,>(value?: T | T[]) =>
  value === undefined ? undefined : Array.isArray(value) ? value : [value]

const primarySet = computed(() => new Set(props.primaryActionIds ?? []))
const categorySet = computed(() => new Set(normalizeToArray(props.category) ?? []))
const scopeSet = computed(() => new Set(normalizeToArray(props.scope) ?? []))

const paletteItems = computed(() =>
  actionsStore.getPaletteItems('', actionContext.value, {
    includeDisabled: true,
    includeUnavailable: true,
  }),
)

const layout = computed(() => props.layout)

const filterItems = (items: ActionPaletteItem[]) => {
  let filtered = items

  if (props.actionIds?.length) {
    const map = new Map(items.map((item) => [item.id, item]))
    filtered = props.actionIds
      .map((id) => map.get(id))
      .filter((item): item is ActionPaletteItem => Boolean(item))
  }

  if (categorySet.value.size) {
    filtered = filtered.filter((item) => categorySet.value.has(item.category))
  }

  if (scopeSet.value.size) {
    filtered = filtered.filter((item) => scopeSet.value.has(item.action.scope))
  }

  if (!props.showDisabled) {
    filtered = filtered.filter((item) => item.enabled)
  }

  if (!props.actionIds?.length) {
    filtered = [...filtered].sort((a, b) => {
      const orderA = a.action.order ?? 1000
      const orderB = b.action.order ?? 1000
      if (orderA !== orderB) return orderA - orderB
      return a.label.localeCompare(b.label)
    })
  }

  return filtered
}

const resolvedItems = computed(() => filterItems(paletteItems.value))

const buttonSize = computed(() => {
  if (layout.value === 'selection') return 'xs'
  if (layout.value === 'sidebar') return 'sm'
  return 'sm'
})

const getVariant = (item: ActionPaletteItem) =>
  primarySet.value.has(item.id) ? 'solid' : 'ghost'

const getColor = (item: ActionPaletteItem) =>
  item.action.tone ?? (primarySet.value.has(item.id) ? 'primary' : 'neutral')

const handleClick = async (item: ActionPaletteItem) => {
  if (!item.enabled) return
  await actionsStore.executeAction(item.id)
}
</script>

<template>
  <div v-if="resolvedItems.length" :class="layout === 'sidebar' ? 'space-y-1' : 'flex flex-wrap items-center gap-2'">
    <template v-for="item in resolvedItems" :key="item.id">
      <template v-if="layout === 'sidebar'">
        <button
          type="button"
          class="w-full text-left px-3 py-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted)/0.5)] transition"
          :class="item.enabled ? 'text-[hsl(var(--foreground))]' : 'opacity-60 cursor-not-allowed'"
          :disabled="!item.enabled"
          :title="item.enabled ? undefined : item.disabledReason"
          @click="handleClick(item)"
        >
          <div class="flex items-start gap-3">
            <UIcon
              v-if="item.icon"
              :name="item.icon"
              class="w-4 h-4 mt-0.5 text-[hsl(var(--muted-foreground))]"
            />
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">{{ item.label }}</div>
              <div v-if="item.description" class="text-xs text-[hsl(var(--muted-foreground))] truncate">
                {{ item.description }}
              </div>
              <div v-if="!item.enabled && item.disabledReason" class="text-[11px] text-[hsl(var(--warning))]">
                {{ item.disabledReason }}
              </div>
            </div>
          </div>
        </button>
      </template>

      <template v-else>
        <UButton
          :icon="item.icon"
          :color="getColor(item)"
          :variant="getVariant(item)"
          :size="buttonSize"
          :disabled="!item.enabled"
          :title="item.enabled ? item.description : item.disabledReason"
          @click="handleClick(item)"
        >
          {{ item.label }}
        </UButton>
      </template>
    </template>
  </div>
</template>
