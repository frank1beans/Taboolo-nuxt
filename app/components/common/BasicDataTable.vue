<script setup lang="ts">
interface Column {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
}

interface Props {
  columns: Column[];
  rows: Array<Record<string, any>>;
  loading?: boolean;
  emptyMessage?: string;
}

const props = withDefaults(defineProps<Props>(), {
  rows: () => [],
  columns: () => [],
  loading: false,
  emptyMessage: 'Nessun dato disponibile',
});

const cellAlignment = (column: Column) => {
  switch (column.align) {
    case 'right':
      return 'text-right';
    case 'center':
      return 'text-center';
    default:
      return 'text-left';
  }
};
</script>

<template>
  <div class="overflow-x-auto rounded-lg border border-slate-200 bg-card dark:border-slate-800">
    <table class="min-w-full text-sm">
      <thead class="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900/50">
        <tr>
          <th
            v-for="column in props.columns"
            :key="column.key"
            class="px-3 py-2"
            :class="cellAlignment(column)"
            scope="col"
          >
            {{ column.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <template v-if="props.loading">
          <tr v-for="index in 4" :key="`skeleton-${index}`" class="border-b border-slate-100 last:border-none dark:border-slate-800">
            <td v-for="column in props.columns" :key="column.key" class="px-3 py-2">
              <div class="h-3.5 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            </td>
          </tr>
        </template>
        <template v-else-if="props.rows.length === 0">
          <tr>
            <td :colspan="props.columns.length" class="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              {{ props.emptyMessage }}
            </td>
          </tr>
        </template>
        <template v-else>
          <tr
            v-for="(row, index) in props.rows"
            :key="index"
            class="border-b border-slate-100 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-900/40"
          >
            <td
              v-for="column in props.columns"
              :key="column.key"
              class="px-3 py-2"
              :class="cellAlignment(column)"
            >
              {{ row[column.key] }}
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
