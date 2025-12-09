<template>
  <div class="text-sm text-muted-foreground">Reindirizzamento alla dashboard...</div>
</template>

<script setup lang="ts">
definePageMeta({
});

onMounted(() => {
  navigateTo("/");
});
</script>
