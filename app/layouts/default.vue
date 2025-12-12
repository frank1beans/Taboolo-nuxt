<script setup lang="ts">
import AppSidebar from '~/components/layout/AppSidebar.vue'
import AppHeader from '~/components/layout/AppHeader.vue'
</script>

<template>
  <UApp>
    <a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground shadow-lg">
      Vai al contenuto principale
    </a>
    <div class="flex min-h-screen bg-background text-foreground">
      <AppSidebar />
      <div class="flex flex-1 flex-col">
        <AppHeader />
        <main id="main-content" class="flex-1 overflow-y-auto" tabindex="-1">
          <div class="mx-auto max-w-6xl p-6">
            <slot />
          </div>
        </main>
      </div>
    </div>
  </UApp>
</template>
