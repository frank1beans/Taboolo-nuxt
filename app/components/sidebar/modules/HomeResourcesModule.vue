<script setup lang="ts">
import { computed, unref, type Ref } from 'vue'
import SidebarModule from '~/components/sidebar/SidebarModule.vue'

type MaybeRef<T> = T | Ref<T>

export interface HomeResourceLink {
  label: string
  icon: string
  href: string
  external?: boolean
}

const props = withDefaults(defineProps<{
  resources?: MaybeRef<HomeResourceLink[]>
  description?: MaybeRef<string>
}>(), {
  resources: () => [],
  description: 'Documentazione e link rapidi per aiutarti nel lavoro.',
})

const resolvedResources = computed(() => (unref(props.resources) ?? []) as HomeResourceLink[])
const resolvedDescription = computed(() => unref(props.description) || '')
</script>

<template>
  <SidebarModule title="Risorse utili" icon="heroicons:book-open">
    <div class="space-y-3">
      <p v-if="resolvedDescription" class="text-xs text-[hsl(var(--muted-foreground))]">
        {{ resolvedDescription }}
      </p>

      <div class="space-y-1">
        <a
          v-for="resource in resolvedResources"
          :key="resource.label"
          :href="resource.href"
          class="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--muted)/0.5)]"
          :target="resource.external ? '_blank' : undefined"
          :rel="resource.external ? 'noreferrer' : undefined"
        >
          <Icon
            :name="resource.icon"
            class="h-4 w-4 text-[hsl(var(--muted-foreground))] transition group-hover:text-[hsl(var(--foreground))]"
          />
          <span class="truncate">{{ resource.label }}</span>
        </a>
      </div>

      <p v-if="!resolvedResources.length" class="text-xs text-[hsl(var(--muted-foreground))] text-center">
        Nessuna risorsa disponibile
      </p>
    </div>
  </SidebarModule>
</template>
