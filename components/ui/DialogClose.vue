<script setup lang="ts">
import { UIcon } from '#components'

const emit = defineEmits<{
  close: []
}>()

const handleClose = () => {
  emit('close')
}
</script>

<template>
  <button
    type="button"
    class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    @click="handleClose"
  >
    <UIcon name="i-lucide-x" class="h-4 w-4" />
    <span class="sr-only">Close</span>
  </button>
</template>
