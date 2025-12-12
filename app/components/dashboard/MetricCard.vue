<script setup lang="ts">
interface Props {
  icon?: string;
  label: string;
  value: string | number;
  description?: string;
}

const props = defineProps<Props>();
</script>

<template>
  <UCard class="h-full">
    <div class="flex items-start gap-3">
      <div
        v-if="props.icon"
        class="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
      >
        <UIcon :name="props.icon" class="h-4 w-4 text-slate-600 dark:text-slate-300" />
      </div>
      <div class="space-y-1">
        <p class="text-[11px] uppercase tracking-wide text-slate-500">{{ props.label }}</p>
        <p class="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          {{ props.value }}
        </p>
        <p v-if="props.description" class="text-xs text-slate-500 dark:text-slate-400">
          {{ props.description }}
        </p>
      </div>
    </div>
  </UCard>
</template>
