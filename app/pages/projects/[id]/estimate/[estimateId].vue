<script setup lang="ts">
// Parent shell to host child routes (index, comparison, offer, detail)
definePageMeta({
  breadcrumb: 'Preventivo',
})
</script>

<template>
  <div class="h-full flex flex-col">
    <NuxtPage />
  </div>
</template>
