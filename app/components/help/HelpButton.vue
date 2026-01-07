<script setup lang="ts">
/**
 * HelpButton.vue
 * 
 * Button component for opening contextual help.
 * Shows a ? icon and tooltip.
 */

const emit = defineEmits<{
  'click': []
}>()
</script>

<template>
  <UTooltip text="Aiuto (F1)">
    <UButton
      icon="i-heroicons-question-mark-circle"
      color="neutral"
      variant="ghost"
      aria-label="Aiuto"
      @click="emit('click')"
    />
  </UTooltip>
</template>
