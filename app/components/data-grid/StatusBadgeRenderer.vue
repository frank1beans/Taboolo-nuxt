<script setup lang="ts">
import { computed } from 'vue';
import { getStatusConfig } from '~/utils/status-mappings';

const props = defineProps<{
  params: any;
}>();

const rawStatus = computed(() => props.params.value);
const config = computed(() => getStatusConfig(rawStatus.value));
</script>

<template>
  <div class="flex items-center h-full">
    <UBadge 
      :color="config.badgeColor" 
      variant="soft" 
      size="md" 
      class="px-2.5 py-1 font-medium rounded-md shadow-sm"
    >
      <Icon v-if="config.icon" :name="config.icon" class="w-3.5 h-3.5 mr-1" />
      {{ config.label }}
    </UBadge>
  </div>
</template>
