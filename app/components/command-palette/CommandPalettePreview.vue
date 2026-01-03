<script setup lang="ts">
import { computed } from 'vue'
import type { CommandPaletteItem } from '~/types/command-palette'

const props = defineProps<{
  item?: CommandPaletteItem | null
}>()

const detailLines = computed(() => {
  if (!props.item?.data) return []
  const data = props.item.data as Record<string, unknown>
  const lines: Array<{ label: string; value: string }> = []

  if (typeof data.code === 'string' && data.code) lines.push({ label: 'Codice', value: data.code })
  if (typeof data.status === 'string' && data.status) lines.push({ label: 'Stato', value: data.status })
  if (typeof data.projectName === 'string' && data.projectName) {
    lines.push({ label: 'Progetto', value: data.projectName })
  }
  if (typeof data.estimateName === 'string' && data.estimateName) {
    lines.push({ label: 'Preventivo', value: data.estimateName })
  }
  if (typeof data.route === 'string' && data.route) lines.push({ label: 'Route', value: data.route })

  return lines
})
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
      <p class="text-[11px] uppercase tracking-wider font-semibold text-[hsl(var(--muted-foreground))]">
        Anteprima
      </p>
    </div>

    <div class="flex-1 p-4 space-y-4">
      <div v-if="!item" class="text-sm text-[hsl(var(--muted-foreground))]">
        Seleziona un comando per vedere i dettagli.
      </div>
      <div v-else class="space-y-3">
        <div>
          <div class="text-base font-semibold text-[hsl(var(--foreground))]">
            {{ item.label }}
          </div>
          <div class="text-xs text-[hsl(var(--muted-foreground))]">
            {{ item.category }}
          </div>
        </div>

        <p v-if="item.description" class="text-sm text-[hsl(var(--foreground))]">
          {{ item.description }}
        </p>

        <div v-if="detailLines.length" class="space-y-2">
          <div
            v-for="line in detailLines"
            :key="line.label"
            class="flex items-center justify-between text-xs"
          >
            <span class="text-[hsl(var(--muted-foreground))]">{{ line.label }}</span>
            <span class="text-[hsl(var(--foreground))] font-medium truncate max-w-[150px]">
              {{ line.value }}
            </span>
          </div>
        </div>

        <div v-if="item.disabledReason" class="text-xs text-[hsl(var(--warning))]">
          {{ item.disabledReason }}
        </div>
      </div>
    </div>
  </div>
</template>
