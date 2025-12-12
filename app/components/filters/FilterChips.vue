<script setup lang="ts">
export interface FilterChip {
  key: string
  label: string
  value: string
  removable?: boolean
}

interface FilterChipsProps {
  filters: FilterChip[]
}

defineProps<FilterChipsProps>()

const emit = defineEmits<{
  remove: [key: string]
  'clear-all': []
}>()
</script>

<template>
  <div v-if="filters.length > 0" class="flex flex-wrap items-center gap-2">
    <span class="text-sm text-muted-foreground font-medium">Filtri attivi:</span>

    <UBadge
      v-for="filter in filters"
      :key="filter.key"
      variant="soft"
      color="primary"
      class="gap-1.5"
    >
      <span class="text-xs">
        <strong>{{ filter.label }}:</strong> {{ filter.value }}
      </span>
      <button
        v-if="filter.removable !== false"
        class="ml-1 hover:bg-primary/20 rounded-full p-0.5 transition-colors"
        @click="emit('remove', filter.key)"
      >
        <UIcon name="i-lucide-x" class="h-3 w-3" />
      </button>
    </UBadge>

    <UButton
      v-if="filters.length > 1"
      size="xs"
      variant="ghost"
      color="gray"
      @click="emit('clear-all')"
    >
      <UIcon name="i-lucide-x-circle" class="mr-1 h-3 w-3" />
      Cancella tutti
    </UButton>
  </div>
</template>
