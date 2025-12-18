<script setup lang="ts">
import { computed } from 'vue'
import { useSidebarLayout } from '~/composables/useSidebarLayout'

interface Crumb {
  label: string
  to?: string
}

const props = withDefaults(
  defineProps<{
    crumbs?: Crumb[]
  }>(),
  { crumbs: () => [] }
)

const colorMode = useColorMode()
const { isCollapsed, toggleCollapsed } = useSidebarLayout()

const items = computed(() => props.crumbs ?? [])

const themeIcon = computed(() =>
  colorMode.value === 'dark'
    ? 'heroicons:sun-20-solid'
    : 'heroicons:moon-20-solid'
)

const collapseIcon = computed(() =>
  isCollapsed.value
    ? 'heroicons:chevron-double-right-20-solid'
    : 'heroicons:chevron-double-left-20-solid'
)

const collapseLabel = computed(() =>
  isCollapsed.value ? 'Espandi sidebar' : 'Collassa sidebar'
)

const toggleTheme = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>

<template>
  <header class="app-topbar page-header-bar sticky top-0 z-40 px-4">
    <div class="flex h-full w-full items-center justify-between gap-4">
      <!-- Left -->
      <div class="flex min-w-0 items-center gap-3">
        <button
          type="button"
          class="app-icon-btn flex h-10 w-10 shrink-0 items-center justify-center"
          :aria-label="collapseLabel"
          :title="collapseLabel"
          @click="toggleCollapsed"
        >
          <Icon :name="collapseIcon" class="h-5 w-5" />
        </button>

        <nav class="flex min-w-0 items-center gap-2 text-sm text-[hsl(var(--sidebar-foreground))]">
          <template v-for="(crumb, index) in items" :key="`${crumb.label}-${index}`">
            <NuxtLink
              v-if="crumb.to"
              :to="crumb.to"
              class="truncate rounded px-1.5 py-0.5 text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--sidebar-accent)/0.6)] hover:text-[hsl(var(--sidebar-foreground))]"
            >
              {{ crumb.label }}
            </NuxtLink>

            <span
              v-else
              class="truncate rounded px-1.5 py-0.5 font-semibold text-[hsl(var(--sidebar-foreground))]"
            >
              {{ crumb.label }}
            </span>

            <Icon
              v-if="index < items.length - 1"
              name="heroicons:chevron-right-20-solid"
              class="h-4 w-4 shrink-0 text-[hsl(var(--muted-foreground))]"
            />
          </template>
        </nav>
      </div>

      <!-- Right -->
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="app-icon-btn flex h-10 w-10 items-center justify-center"
          :aria-label="colorMode.value === 'dark' ? 'Passa a tema chiaro' : 'Passa a tema scuro'"
          :title="colorMode.value === 'dark' ? 'Tema chiaro' : 'Tema scuro'"
          @click="toggleTheme"
        >
          <Icon :name="themeIcon" class="h-5 w-5" />
        </button>
      </div>
    </div>
  </header>
</template>
