<script setup lang="ts">
import { ref, computed } from 'vue'
import { UIcon } from '#components'

export interface TableToolbarProps {
  searchPlaceholder?: string
  enableSearch?: boolean
  enableExport?: boolean
  enableColumnToggle?: boolean
  filterCount?: number
}

const props = withDefaults(defineProps<TableToolbarProps>(), {
  searchPlaceholder: 'Cerca...',
  enableSearch: true,
  enableExport: true,
  enableColumnToggle: false,
  filterCount: 0,
})

const emit = defineEmits<{
  search: [query: string]
  export: []
  clearFilters: []
  toggleColumns: []
}>()

const searchQuery = ref('')

const handleSearch = (value: string) => {
  searchQuery.value = value
  emit('search', value)
}

const handleClearSearch = () => {
  searchQuery.value = ''
  emit('search', '')
}

const handleExport = () => {
  emit('export')
}

const handleClearFilters = () => {
  emit('clearFilters')
}

const handleToggleColumns = () => {
  emit('toggleColumns')
}

const hasActiveFilters = computed(() => props.filterCount > 0)
</script>

<template>
  <div class="flex items-center justify-between gap-3 py-3">
    <!-- Left side: Search and Filters -->
    <div class="flex items-center gap-3 flex-1">
      <!-- Search Input -->
      <div v-if="enableSearch" class="relative w-full max-w-sm">
        <div class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <UIcon name="i-lucide-search" class="h-4 w-4" />
        </div>
        <input
          :value="searchQuery"
          type="search"
          :placeholder="searchPlaceholder"
          class="w-full rounded-lg border border-border bg-background pl-9 pr-9 py-2 text-sm outline-none ring-1 ring-transparent transition focus:border-ring focus:ring-ring/30"
          @input="(e) => handleSearch((e.target as HTMLInputElement).value)"
        >
        <button
          v-if="searchQuery"
          class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors rounded"
          @click="handleClearSearch"
        >
          <UIcon name="i-lucide-x" class="h-3.5 w-3.5" />
        </button>
      </div>

      <!-- Active Filters Badge -->
      <div v-if="hasActiveFilters" class="flex items-center gap-2">
        <Badge variant="secondary">{{ filterCount }} filtri attivi</Badge>
        <Button size="sm" variant="ghost" class="h-8" @click="handleClearFilters">
          Rimuovi filtri
        </Button>
      </div>

      <!-- Additional Slot for Custom Filters -->
      <slot name="filters" />
    </div>

    <!-- Right side: Actions -->
    <div class="flex items-center gap-2">
      <!-- Column Toggle -->
      <Button
        v-if="enableColumnToggle"
        size="sm"
        variant="outline"
        class="h-8"
        @click="handleToggleColumns"
      >
        <UIcon name="i-lucide-settings" class="mr-2 h-3.5 w-3.5" />
        Colonne
      </Button>

      <!-- Export Button -->
      <Button v-if="enableExport" size="sm" variant="outline" class="h-8" @click="handleExport">
        <UIcon name="i-lucide-download" class="mr-2 h-3.5 w-3.5" />
        Esporta
      </Button>

      <!-- Additional Actions Slot -->
      <slot name="actions" />
    </div>
  </div>
</template>
