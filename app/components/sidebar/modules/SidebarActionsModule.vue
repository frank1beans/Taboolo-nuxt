<script setup lang="ts">
import { computed, unref } from 'vue'
import SidebarModule from '~/components/sidebar/SidebarModule.vue'
import ActionList from '~/components/actions/ActionList.vue'

const props = withDefaults(defineProps<{
  title?: string
  icon?: string
  actionIds: string[]
  selectedCount?: number
  emptyMessage?: string
  showCountBadge?: boolean
}>(), {
  title: 'Azioni',
  icon: 'i-heroicons-bolt',
  emptyMessage: 'Seleziona uno o piu elementi per vedere le azioni.',
  showCountBadge: true,
})

const resolvedCount = computed(() => unref(props.selectedCount))

const hasSelection = computed(() =>
  resolvedCount.value === undefined ? true : resolvedCount.value > 0,
)
</script>

<template>
  <SidebarModule :title="title" :icon="icon" default-open>
    <div v-if="showCountBadge && resolvedCount !== undefined" class="flex items-center justify-between mb-3">
      <span class="text-[10px] text-[hsl(var(--muted-foreground))] uppercase font-bold tracking-wider">Selezione</span>
      <span class="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
        {{ resolvedCount }} elementi
      </span>
    </div>

    <div v-if="hasSelection">
      <ActionList
        layout="sidebar"
        :action-ids="actionIds"
        :selection-count="resolvedCount"
        :show-disabled="true"
      />
    </div>

    <div v-else class="text-center py-6 text-xs text-[hsl(var(--muted-foreground))]">
      <div class="w-10 h-10 mx-auto rounded-full bg-[hsl(var(--muted))/0.5] flex items-center justify-center mb-3">
        <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
      </div>
      <p>{{ emptyMessage }}</p>
    </div>
  </SidebarModule>
</template>
