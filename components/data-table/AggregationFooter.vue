<script setup lang="ts">
import { computed } from 'vue'
import type { GridApi } from 'ag-grid-community'

export interface AggregationFooterProps {
  gridApi: GridApi | null
  aggregations?: AggregationConfig[]
}

export interface AggregationConfig {
  field: string
  label: string
  type: 'sum' | 'avg' | 'count' | 'min' | 'max'
  format?: (value: number) => string
}

const props = defineProps<AggregationFooterProps>()

const defaultFormat = (value: number) => {
  return value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const calculateAggregations = computed(() => {
  if (!props.gridApi || !props.aggregations) return []

  const results: { label: string; value: string; type: string }[] = []

  for (const agg of props.aggregations) {
    const values: number[] = []

    // Get all filtered row data
    props.gridApi.forEachNodeAfterFilter((node) => {
      if (node.data && node.data[agg.field] !== undefined && node.data[agg.field] !== null) {
        const value = Number(node.data[agg.field])
        if (!isNaN(value)) {
          values.push(value)
        }
      }
    })

    let calculatedValue: number | null = null

    switch (agg.type) {
      case 'sum':
        calculatedValue = values.reduce((sum, val) => sum + val, 0)
        break
      case 'avg':
        calculatedValue = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0
        break
      case 'count':
        calculatedValue = values.length
        break
      case 'min':
        calculatedValue = values.length > 0 ? Math.min(...values) : 0
        break
      case 'max':
        calculatedValue = values.length > 0 ? Math.max(...values) : 0
        break
    }

    if (calculatedValue !== null) {
      const formatter = agg.format || defaultFormat
      results.push({
        label: agg.label,
        value: formatter(calculatedValue),
        type: agg.type,
      })
    }
  }

  return results
})

const getTypeLabel = (type: string): string => {
  switch (type) {
    case 'sum':
      return 'Totale'
    case 'avg':
      return 'Media'
    case 'count':
      return 'Conteggio'
    case 'min':
      return 'Minimo'
    case 'max':
      return 'Massimo'
    default:
      return type
  }
}
</script>

<template>
  <div
    v-if="calculateAggregations.length > 0"
    class="border-t bg-muted/30 px-4 py-3 flex items-center justify-between flex-wrap gap-4"
  >
    <div class="flex items-center gap-6 flex-wrap">
      <div
        v-for="(agg, index) in calculateAggregations"
        :key="index"
        class="flex flex-col gap-0.5"
      >
        <span class="text-xs text-muted-foreground font-medium">
          {{ agg.label }} ({{ getTypeLabel(agg.type) }})
        </span>
        <span class="text-sm font-semibold font-mono">{{ agg.value }}</span>
      </div>
    </div>

    <!-- Additional slot for custom aggregations -->
    <div class="flex items-center gap-3">
      <slot />
    </div>
  </div>
</template>
