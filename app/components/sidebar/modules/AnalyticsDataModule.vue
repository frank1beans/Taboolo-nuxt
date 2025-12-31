<script setup lang="ts">
import { computed, unref, type Ref } from 'vue'
interface Project {
  id: string
  name?: string
  code?: string
}

interface GlobalFilters {
  projectIds: string[]
  year: number | null
  businessUnit: string | null
}

type MaybeRef<T> = T | Ref<T>

const props = defineProps<{
  mode: MaybeRef<'global' | 'properties'>
  filters: MaybeRef<GlobalFilters>
  availableProjects: MaybeRef<Project[]>
  availableYears: MaybeRef<number[]>
  availableBusinessUnits: MaybeRef<string[]>
  isLoadingMap: MaybeRef<boolean>
}>()

const emit = defineEmits<{
  'update:mode': [mode: 'global' | 'properties']
  'update:filters': [filters: GlobalFilters]
  refreshMap: []
}>()

const resolvedMode = computed(() => unref(props.mode))
const resolvedFilters = computed(() => unref(props.filters))
const resolvedProjects = computed(() => unref(props.availableProjects) ?? [])
const resolvedYears = computed(() => unref(props.availableYears) ?? [])
const resolvedBusinessUnits = computed(() => unref(props.availableBusinessUnits) ?? [])
const resolvedLoading = computed(() => Boolean(unref(props.isLoadingMap)))

const updateFilter = (key: keyof GlobalFilters, value: GlobalFilters[keyof GlobalFilters]) => {
  emit('update:filters', { ...resolvedFilters.value, [key]: value })
}

const modeOptions = [
  { label: 'Globale', value: 'global' as const },
  { label: 'Proprieta', value: 'properties' as const }
]
</script>

<template>
  <SidebarModule title="Dati" subtitle="Filtri" icon="heroicons:adjustments-horizontal">
    <template #header-actions>
      <div class="flex p-0.5 bg-[hsl(var(--muted)/0.3)] rounded-lg border border-[hsl(var(--border))]">
        <button
          v-for="opt in modeOptions"
          :key="opt.value"
          class="px-2 py-1 text-[10px] font-medium rounded-md transition-all"
          :class="resolvedMode === opt.value
            ? 'bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm'
            : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'"
          @click="emit('update:mode', opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
    </template>

    <div class="space-y-4">
      <div class="space-y-2">
        <h3 class="panel-section-header">Filtri Dati</h3>

        <div class="space-y-1">
          <label class="text-[10px] text-[hsl(var(--muted-foreground))]">Progetti</label>
          <USelectMenu
            :model-value="resolvedFilters.projectIds"
            :items="resolvedProjects"
            option-attribute="name"
            value-attribute="id"
            multiple
            placeholder="Tutti i progetti"
            size="sm"
            @update:model-value="(val) => updateFilter('projectIds', val)"
          />
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div class="space-y-1">
            <label class="text-[10px] text-[hsl(var(--muted-foreground))]">Anno</label>
            <USelectMenu
              :model-value="resolvedFilters.year"
              :items="[{ label: 'Tutti', value: null }, ...resolvedYears.map(y => ({ label: String(y), value: y }))]"
              value-attribute="value"
              placeholder="Tutti"
              size="sm"
              @update:model-value="(val) => updateFilter('year', val)"
            />
          </div>
          <div class="space-y-1">
            <label class="text-[10px] text-[hsl(var(--muted-foreground))]">BU</label>
            <USelectMenu
              :model-value="resolvedFilters.businessUnit"
              :items="[{ label: 'Tutte', value: null }, ...resolvedBusinessUnits.map(b => ({ label: b, value: b }))]"
              value-attribute="value"
              placeholder="Tutte"
              size="sm"
              @update:model-value="(val) => updateFilter('businessUnit', val)"
            />
          </div>
        </div>

        <UButton
          block
          size="xs"
          color="neutral"
          variant="soft"
          icon="i-heroicons-arrow-path"
          :loading="resolvedLoading"
          @click="emit('refreshMap')"
        >
          Aggiorna Filtri
        </UButton>
      </div>
    </div>
  </SidebarModule>
</template>
