<template>
  <header class="flex items-center justify-between border-b border-border bg-card/60 px-4 py-3 backdrop-blur">
    <div>
      <p class="text-sm font-semibold">Dashboard</p>
      <p class="text-xs text-muted-foreground">Nuxt version in progress</p>
    </div>
    <div class="flex items-center gap-3">
      <NuxtLink to="/profile" class="text-sm font-medium hover:text-foreground">
        Profile
      </NuxtLink>
      <button
        type="button"
        class="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80"
        @click="handleLogout"
      >
        Logout
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useAuth } from "@/composables/useAuth";

const { logout } = useAuth();

const handleLogout = () => {
  logout();
  navigateTo("/login");
};
</script>
