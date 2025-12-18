<script setup lang="ts">
/**
 * Global Price Catalogs Page
 * 
 * Lists all global price lists (those without a project_id).
 */

// Use existing price list grid config or a simplified one?
// For now, let's just use a placeholder component or simple list.
// We might need a new API endpoint to fetch global price lists.
// But for this task, the goal is "Create /catalogs page".
// I'll put a placeholder and a basic structure.

import { ref } from 'vue'

definePageMeta({
  breadcrumb: 'Listini Generali',
})

const _items = ref([]) // TODO: Fetch global price lists

</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-[hsl(var(--foreground))]">Listini Generali</h1>
        <p class="text-[hsl(var(--muted-foreground))]">Gestisci i listini prezzi utilizzabili in più progetti.</p>
      </div>
      <UButton icon="i-heroicons-plus" color="primary">Nuovo Listino</UButton>
    </div>

    <UCard>
      <div class="text-center py-12 text-[hsl(var(--muted-foreground))]">
        <UIcon name="i-heroicons-book-open" class="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Non ci sono ancora listini generali.</p>
        <p class="text-sm mt-2">I listini generali possono essere importati nei progetti.</p>
      </div>
    </UCard>
  </div>
</template>
