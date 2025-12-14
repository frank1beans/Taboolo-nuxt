<template>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div class="space-y-1">
      <p v-if="subtitle" class="text-xs uppercase tracking-wide text-[hsl(var(--muted-foreground))]">{{ subtitle }}</p>
      <h1 class="text-lg font-semibold text-[hsl(var(--foreground))]">{{ title }}</h1>
      <slot name="description" />
    </div>
    <div class="flex items-center gap-2">
      <slot name="meta" />
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  subtitle?: string;
}>();
</script>
