<script setup lang="ts">
/**
 * SidebarActionsModule.vue
 *
 * Reusable sidebar component to display groups of actions.
 * Can render either a list of registered actions or custom groups.
 */
import { computed } from 'vue'
import ActionList from '~/components/actions/ActionList.vue'
import type { ActionScope } from '~/types/actions'

export interface ActionItem {
  label: string
  icon?: string
  handler: () => void
  variant?: 'default' | 'primary' | 'danger'
  disabled?: boolean
}

export interface ActionGroup {
  title?: string
  actions: ActionItem[]
}

const props = withDefaults(defineProps<{
  groups?: ActionGroup[]
  actionIds?: string[]
  primaryActionIds?: string[]
  category?: string | string[]
  scope?: ActionScope | ActionScope[]
  selectionCount?: number
  showDisabled?: boolean
  emptyMessage?: string
}>(), {
  groups: () => [],
  actionIds: undefined,
  primaryActionIds: () => [],
  category: undefined,
  scope: undefined,
  selectionCount: undefined,
  showDisabled: true,
  emptyMessage: 'Nessuna azione disponibile',
})

const showActionList = computed(() =>
  Boolean(props.actionIds?.length || props.category || props.scope),
)

const showGroups = computed(() => (props.groups?.length ?? 0) > 0)
const showEmpty = computed(() => !showActionList.value && !showGroups.value)
</script>

<template>
  <div class="sidebar-actions-module p-2 flex flex-col gap-3">
    <ActionList
      v-if="showActionList"
      layout="sidebar"
      :action-ids="actionIds"
      :primary-action-ids="primaryActionIds"
      :category="category"
      :scope="scope"
      :selection-count="selectionCount"
      :show-disabled="showDisabled"
    />

    <div v-if="showGroups" class="flex flex-col gap-6">
      <div v-for="(group, idx) in groups" :key="idx" class="flex flex-col gap-2">
        <!-- Separator for subsequent groups -->
        <div v-if="idx > 0" class="h-px bg-[hsl(var(--border)/0.5)] my-2 mx-1" />

        <!-- Group Title -->
        <h3
          v-if="group.title"
          class="text-[11px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-widest mb-2 px-2"
        >
          {{ group.title }}
        </h3>

        <!-- Actions -->
        <div class="flex flex-col gap-1">
          <button
            v-for="(action, aIdx) in group.actions"
            :key="aIdx"
            type="button"
            :disabled="action.disabled"
            @click="action.handler"
            class="group flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 relative overflow-hidden focus-visible:ring-2 focus-visible:ring-offset-1 text-left"
            :class="[
              action.variant === 'primary'
                ? 'bg-[hsl(var(--primary))] text-primary-foreground hover:brightness-110 shadow-sm justify-center text-center my-1'
                : action.variant === 'danger'
                  ? 'text-red-500 hover:bg-red-50'
                  : 'text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted)/0.5)]',
            ]"
          >
            <Icon
              v-if="action.icon"
              :name="action.icon"
              class="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110"
              :class="{ 'opacity-80': action.variant !== 'primary' }"
            />
            <span class="truncate">{{ action.label }}</span>

            <!-- Hover effect helper -->
            <div
              v-if="action.variant !== 'primary'"
              class="absolute inset-0 bg-current opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none"
            />
          </button>
        </div>
      </div>
    </div>

    <p v-if="showEmpty" class="text-xs text-[hsl(var(--muted-foreground))] text-center">
      {{ emptyMessage }}
    </p>
  </div>
</template>
