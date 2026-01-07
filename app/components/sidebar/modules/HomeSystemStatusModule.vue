<script setup lang="ts">
import { computed, unref, type Ref } from 'vue'
import SidebarModule from '~/components/sidebar/SidebarModule.vue'

type MaybeRef<T> = T | Ref<T>

export interface SystemStatus {
  label: string
  version?: string
  detail?: string
  online?: boolean
}

const props = defineProps<{
  status?: MaybeRef<SystemStatus | null>
}>()

const resolvedStatus = computed(() => unref(props.status) ?? null)
const isOnline = computed(() => resolvedStatus.value?.online !== false)
</script>

<template>
  <SidebarModule title="Stato sistema" icon="heroicons:signal">
    <div v-if="resolvedStatus" class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2">
      <div class="flex items-center gap-3">
        <div class="relative flex h-2.5 w-2.5">
          <span
            class="absolute inline-flex h-full w-full rounded-full opacity-75"
            :class="isOnline ? 'animate-ping bg-emerald-400' : 'bg-red-400'"
          />
          <span
            class="relative inline-flex h-2.5 w-2.5 rounded-full"
            :class="isOnline ? 'bg-emerald-500' : 'bg-red-500'"
          />
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-[hsl(var(--foreground))] truncate">
            {{ resolvedStatus.label }}
          </div>
          <div v-if="resolvedStatus.detail" class="text-xs text-[hsl(var(--muted-foreground))] truncate">
            {{ resolvedStatus.detail }}
          </div>
        </div>
        <span v-if="resolvedStatus.version" class="text-xs text-[hsl(var(--muted-foreground))]">
          {{ resolvedStatus.version }}
        </span>
      </div>
    </div>

    <div v-else class="text-xs text-[hsl(var(--muted-foreground))] text-center py-4">
      Stato sistema non disponibile
    </div>
  </SidebarModule>
</template>
