<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  params: any;
}>();

const status = computed(() => props.params.value);

const badgeColor = computed(() => {
  switch (status.value) {
    case 'setup':
      return 'orange';
    case 'in_progress':
      return 'blue';
    case 'closed':
      return 'green';
    default:
      return 'gray';
  }
});

const label = computed(() => {
  const statusMap: Record<string, string> = {
    setup: 'Setup',
    in_progress: 'In corso',
    closed: 'Chiuso',
  };
  return statusMap[status.value] || status.value;
});
</script>

<template>
  <div class="flex items-center h-full">
    <UBadge 
      :color="badgeColor" 
      variant="soft" 
      size="md" 
      class="px-2.5 py-1 font-medium rounded-md shadow-sm"
    >
      {{ label }}
    </UBadge>
  </div>
</template>
