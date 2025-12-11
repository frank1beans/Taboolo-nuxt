<template>
  <div class="flex min-h-screen w-full bg-background">
    <AppSidebar />
    <div class="flex h-screen flex-1 flex-col overflow-hidden">
      <TopBar />
      <main class="flex-1 overflow-y-auto">
        <div class="app-surface">
          <div class="page-content">
            <slot />
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppSidebar from "./AppSidebar.vue";
import TopBar from "./TopBar.vue";
</script>
