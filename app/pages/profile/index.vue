<template>
  <div class="space-y-3">
    <div>
      <p class="text-xs uppercase tracking-[0.18em] text-muted-foreground">Profile</p>
      <h1 class="text-xl font-semibold">User profile</h1>
      <p class="text-sm text-muted-foreground">Data loaded from /profile.</p>
    </div>

    <div class="rounded-xl border border-border bg-card/60 p-4 shadow-sm">
      <p class="text-sm font-semibold">Email</p>
      <p class="text-sm text-muted-foreground">{{ profile?.email ?? "—" }}</p>
      <p class="mt-2 text-sm font-semibold">Name</p>
      <p class="text-sm text-muted-foreground">{{ profile?.full_name ?? "—" }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
});

const { profile, refreshProfile } = useAuth();

onMounted(() => {
  void refreshProfile();
});
</script>
