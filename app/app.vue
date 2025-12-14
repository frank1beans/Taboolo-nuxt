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
  <ColorScheme tag="div">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </ColorScheme>
  <Toaster position="top-right" />
</template>
