<script setup lang="ts">
import { computed, unref, type Ref } from 'vue'
import SidebarModule from '~/components/sidebar/SidebarModule.vue'

type MaybeRef<T> = T | Ref<T>

export interface HomeQuickAction {
  label: string
  icon: string
  to: string
  color?: string
}

const props = withDefaults(defineProps<{
  actions?: MaybeRef<HomeQuickAction[]>
}>(), {
  actions: () => [],
})

const resolvedActions = computed(() => (unref(props.actions) ?? []) as HomeQuickAction[])
</script>

<template>
  <SidebarModule title="Azioni rapide" icon="heroicons:bolt">
    <div class="space-y-2">
      <NuxtLink
        v-for="action in resolvedActions"
        :key="action.label"
        :to="action.to"
        class="group flex items-center gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-2 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--muted)/0.5)]"
      >
        <div
          class="flex h-8 w-8 items-center justify-center rounded-md shadow-sm"
          :class="action.color || 'bg-[hsl(var(--primary))] text-primary-foreground'"
        >
          <Icon :name="action.icon" class="w-4 h-4" />
        </div>
        <span class="truncate">{{ action.label }}</span>
        <Icon
          name="heroicons:chevron-right"
          class="ml-auto h-4 w-4 text-[hsl(var(--muted-foreground))] opacity-0 transition-opacity group-hover:opacity-100"
        />
      </NuxtLink>

      <p v-if="!resolvedActions.length" class="text-xs text-[hsl(var(--muted-foreground))] text-center">
        Nessuna azione disponibile
      </p>
    </div>
  </SidebarModule>
</template>
