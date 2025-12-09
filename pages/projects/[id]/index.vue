<template>
  <div class="text-sm text-muted-foreground">Redirecting to project overview...</div>
</template>

<script setup lang="ts">
definePageMeta({
  alias: ["/commesse/:id"],
});

const route = useRoute();

onMounted(() => {
  navigateTo(`/projects/${route.params.id}/overview`, { replace: true });
});
</script>
