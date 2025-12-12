<script setup lang="ts">
import { Toaster } from 'vue-sonner'

useHead({
  htmlAttrs: {
    lang: 'it'
  },
  titleTemplate: (title) => title ? `${title} | Taboolo` : 'Taboolo Enterprise'
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <Toaster position="top-right" />
</template>
