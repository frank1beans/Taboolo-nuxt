<script setup lang="ts">
import { computed, resolveComponent } from 'vue';
import TableActionMenu, { type TableActionItem } from './TableActionMenu.vue';
import type { DataGridRowAction } from '~/types/data-grid';

type RowActionParams = {
  data?: Record<string, unknown>;
  context?: {
    getRowActions?: (row?: Record<string, unknown>) => DataGridRowAction[];
  };
  overflowRenderer?: string | Record<string, unknown>;
};

const props = defineProps<{
  params: RowActionParams;
}>();

const row = computed(() => props.params?.data);

const actions = computed(() => props.params?.context?.getRowActions?.(row.value) || []);
const visibleActions = computed(() =>
  actions.value.filter((action) => {
    if (typeof action.visible === 'function') return action.visible(row.value);
    if (typeof action.visible === 'boolean') return action.visible;
    return true;
  }),
);

const primaryAction = computed(() => {
  if (!visibleActions.value.length) return null;
  return (
    visibleActions.value.find(action => action.primary) ||
    visibleActions.value.find(action => action.id === 'open') ||
    visibleActions.value[0]
  );
});

const overflowActions = computed(() => {
  if (!visibleActions.value.length) return [];
  const primary = primaryAction.value;
  return primary ? visibleActions.value.filter(action => action !== primary) : visibleActions.value;
});

const overflowItems = computed<TableActionItem[][]>(() => {
  if (!overflowActions.value.length) return [];
  return [
    overflowActions.value.map(action => ({
      label: action.label,
      icon: action.icon,
      color: action.color,
      disabled: typeof action.disabled === 'function' ? action.disabled(row.value) : action.disabled,
      click: () => action.onClick?.(row.value),
    })),
  ];
});

const overflowComponent = computed(() => {
  const renderer = props.params?.overflowRenderer;
  if (!renderer) return null;
  if (typeof renderer === 'string') return resolveComponent(renderer);
  return renderer;
});

const primaryIcon = computed(() => primaryAction.value?.icon || 'i-heroicons-arrow-right-circle');
const primaryTooltip = computed(() => primaryAction.value?.tooltip || primaryAction.value?.label || 'Apri');
const primaryDisabled = computed(() => {
  if (!primaryAction.value) return true;
  if (typeof primaryAction.value.disabled === 'function') {
    return primaryAction.value.disabled(row.value);
  }
  return Boolean(primaryAction.value.disabled);
});

const runPrimaryAction = () => {
  if (!primaryAction.value || primaryDisabled.value) return;
  primaryAction.value.onClick?.(row.value);
};
</script>

<template>
  <div class="data-grid-row-actions flex items-center justify-center gap-1" data-stop-row-click>
    <UTooltip v-if="primaryAction" :text="primaryTooltip">
      <UButton
        color="neutral"
        variant="ghost"
        size="xs"
        :icon="primaryIcon"
        :aria-label="primaryTooltip"
        :disabled="primaryDisabled"
        class="data-grid-row-actions__primary transition-colors duration-200"
        :class="[
          (primaryAction?.id === 'open' || primaryIcon.includes('arrow')) 
            ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300' 
            : 'text-[hsl(var(--foreground))]'
        ]"
        @click.stop="runPrimaryAction"
      />
    </UTooltip>

    <component v-if="overflowComponent" :is="overflowComponent" :params="props.params" />
    <TableActionMenu v-else-if="overflowItems.length" :items="overflowItems" />
  </div>
</template>
