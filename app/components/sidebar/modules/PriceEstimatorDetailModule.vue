<script setup lang="ts">
import { computed, unref, type Ref } from 'vue'
import SidebarModule from '~/components/sidebar/SidebarModule.vue'
import { formatCurrency } from '~/lib/formatters'
import type { SimilarItem } from '~/composables/usePriceEstimator'

type MaybeRef<T> = T | Ref<T>

interface SimilarItemDetail extends SimilarItem {
  long_description?: string | null
  extended_description?: string | null
  longDescription?: string | null
  extendedDescription?: string | null
}

const props = defineProps<{
  item: MaybeRef<SimilarItemDetail | null>
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const resolvedItem = computed(() => unref(props.item))
const longDescription = computed(() => {
  const item = resolvedItem.value
  if (!item) return ''
  return (
    item.long_description ||
    item.extended_description ||
    item.longDescription ||
    item.extendedDescription ||
    ''
  )
})
const similarityPercent = computed(() =>
  resolvedItem.value ? Math.round(resolvedItem.value.similarity * 100) : null
)
const scorePercent = computed(() =>
  resolvedItem.value ? Math.round(resolvedItem.value.combined_score * 100) : null
)
const matchCount = computed(() => resolvedItem.value?.property_matches?.length ?? 0)
const matchedCount = computed(() =>
  resolvedItem.value?.property_matches?.filter((match) => match.is_match).length ?? 0
)
</script>

<template>
  <SidebarModule title="Dettaglio Voce" icon="heroicons:document-text">
    <template #header-actions>
      <UButton
        icon="i-heroicons-x-mark"
        size="xs"
        variant="ghost"
        color="neutral"
        class="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
        @click="emit('close')"
      />
    </template>

    <div v-if="resolvedItem" class="space-y-4">
      <div class="space-y-2">
        <div class="flex flex-wrap items-center gap-2">
          <span
            class="font-mono font-bold text-xs px-2 py-1 bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded"
          >
            {{ resolvedItem.code }}
          </span>
          <span class="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1">
            <UIcon name="i-heroicons-folder" class="w-3 h-3" />
            {{ resolvedItem.project_name }}
          </span>
        </div>
        <p class="text-sm font-medium text-[hsl(var(--foreground))] leading-relaxed">
          {{ resolvedItem.description }}
        </p>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div class="p-2 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded">
          <div class="text-[10px] text-[hsl(var(--muted-foreground))] uppercase font-bold tracking-wider">Prezzo</div>
          <div class="text-sm font-bold text-[hsl(var(--foreground))] mt-0.5">
            {{ formatCurrency(resolvedItem.price) }}
          </div>
        </div>
        <div class="p-2 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded">
          <div class="text-[10px] text-[hsl(var(--muted-foreground))] uppercase font-bold tracking-wider">Unita</div>
          <div class="text-sm font-bold text-[hsl(var(--foreground))] mt-0.5">
            {{ resolvedItem.unit || '-' }}
          </div>
        </div>
        <div class="p-2 bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] rounded">
          <div class="text-[10px] text-[hsl(var(--muted-foreground))] uppercase font-bold tracking-wider">Similarita</div>
          <div class="text-sm font-bold text-[hsl(var(--foreground))] mt-0.5">
            {{ similarityPercent !== null ? `${similarityPercent}%` : '-' }}
          </div>
        </div>
        <div class="p-2 bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))] rounded">
          <div class="text-[10px] text-[hsl(var(--muted-foreground))] uppercase font-bold tracking-wider">Score</div>
          <div class="text-sm font-bold text-[hsl(var(--foreground))] mt-0.5">
            {{ scorePercent !== null ? `${scorePercent}%` : '-' }}
          </div>
        </div>
      </div>

      <div
        v-if="longDescription && longDescription !== resolvedItem.description"
        class="p-3 bg-[hsl(var(--muted)/0.3)] rounded-lg text-xs leading-relaxed text-[hsl(var(--muted-foreground))]"
      >
        {{ longDescription }}
      </div>

      <div v-if="matchCount" class="space-y-2 pt-2 border-t border-[hsl(var(--border))]">
        <div class="flex items-center justify-between">
          <h4 class="panel-section-header">Proprieta</h4>
          <span class="text-[10px] text-[hsl(var(--muted-foreground))]">
            {{ matchedCount }}/{{ matchCount }} match
          </span>
        </div>
        <div class="space-y-2">
          <div
            v-for="match in resolvedItem.property_matches"
            :key="match.name"
            class="p-2 rounded border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)]"
          >
            <div class="flex items-start justify-between gap-2">
              <span class="text-xs font-semibold text-[hsl(var(--foreground))]">
                {{ match.name }}
              </span>
              <span
                class="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                :class="match.is_match
                  ? 'bg-[hsl(var(--success-light))] text-[hsl(var(--success))]'
                  : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'"
              >
                {{ match.is_match ? 'match' : 'no' }}
              </span>
            </div>
            <div class="mt-1 space-y-1 text-[10px] text-[hsl(var(--muted-foreground))]">
              <div class="flex items-start justify-between gap-2">
                <span>Query</span>
                <span class="text-right text-[hsl(var(--foreground))]">
                  {{ match.query_value || '-' }}
                </span>
              </div>
              <div class="flex items-start justify-between gap-2">
                <span>Voce</span>
                <span class="text-right text-[hsl(var(--foreground))]">
                  {{ match.item_value || '-' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex flex-col items-center justify-center h-48 text-[hsl(var(--muted-foreground))]">
      <UIcon name="i-heroicons-cursor-arrow-rays" class="w-8 h-8 mb-2 opacity-50" />
      <span class="text-xs">Seleziona una voce per i dettagli</span>
    </div>
  </SidebarModule>
</template>

<style scoped>
.panel-section-header {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: hsl(var(--muted-foreground));
  letter-spacing: 0.05em;
}
</style>
