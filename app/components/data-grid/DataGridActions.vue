<script setup lang="ts">
import { computed } from 'vue';
import TableActionMenu, { type TableActionItem } from '~/components/data-grid/TableActionMenu.vue';

type RowActionParams = {
  data?: Record<string, unknown>;
  context?: {
    rowActions?: {
      open?: (row: Record<string, unknown> | undefined) => void;
      viewPricelist?: (row: Record<string, unknown> | undefined) => void;
      viewOffer?: (row: Record<string, unknown> | undefined) => void;
      resolve?: (row: Record<string, unknown> | undefined) => void;
      edit?: (row: Record<string, unknown> | undefined) => void;
      remove?: (row: Record<string, unknown> | undefined) => void;
    };
    hasAlerts?: (row: Record<string, unknown> | undefined) => boolean;
    isActionVisible?: (action: string, row: Record<string, unknown> | undefined) => boolean;
  };
};

const props = defineProps<{
  params: RowActionParams;
}>();

const row = computed(() => props.params?.data);
const actions = computed(() => props.params?.context?.rowActions || {});
const hasAlerts = computed(() => props.params?.context?.hasAlerts?.(row.value) ?? false);

const runAction = (key: keyof typeof actions.value) => {
  actions.value[key]?.(row.value);
};

const menuItems = computed<TableActionItem[][]>(() => {
  const acts = actions.value;
  const groups: TableActionItem[][] = [];
  
  const isVisible = (key: string) => {
    if (!props.params?.context?.isActionVisible) return true;
    return props.params.context.isActionVisible(key, row.value);
  };

  // Group 1: Primary actions (Open, View Pricelist, View Offer)
  const group1: TableActionItem[] = [];
  if (acts.open && isVisible('open')) {
    group1.push({ label: 'Apri', icon: 'i-heroicons-arrow-right-circle', click: () => runAction('open') });
  }
  if (acts.viewPricelist && isVisible('viewPricelist')) {
    group1.push({ label: 'Vedi Listino', icon: 'i-heroicons-list-bullet', click: () => runAction('viewPricelist') });
  }
  if (acts.viewOffer && isVisible('viewOffer')) {
    group1.push({ label: 'Vedi Documento', icon: 'i-heroicons-document-text', click: () => runAction('viewOffer') });
  }
  if (group1.length) groups.push(group1);

  // Group 2: Alerts
  if (acts.resolve && hasAlerts.value && isVisible('resolve')) {
    groups.push([{ 
      label: 'Risolvi conflitti', 
      icon: 'i-heroicons-wrench-screwdriver', 
      click: () => runAction('resolve'),
      color: 'primary'
    }]);
  }

  // Group 3: Edit/Delete
  const group3: TableActionItem[] = [];
  if (acts.edit && isVisible('edit')) {
    group3.push({ label: 'Modifica', icon: 'i-heroicons-pencil-square', click: () => runAction('edit') });
  }
  if (acts.remove && isVisible('remove')) {
    group3.push({ label: 'Elimina', icon: 'i-heroicons-trash', click: () => runAction('remove'), color: 'red' as const });
  }
  if (group3.length) groups.push(group3);

  return groups;
});
</script>

<template>
  <TableActionMenu :items="menuItems" />
</template>
