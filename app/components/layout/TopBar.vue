<script setup lang="ts">
import AppHeader from './AppHeader.vue'

interface Crumb {
  label: string
  to?: string
}

const props = defineProps<{
  crumbs?: Crumb[]
}>()
</script>

<template>
  <AppHeader v-bind="props" />
</template>
