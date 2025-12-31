<script setup lang="ts">
import { computed } from 'vue';
import { getStatusConfig, mapEntityStatus } from '~/utils/status-mappings';

const props = defineProps<{
  status?: string;
}>();

const statusConfig = computed(() => getStatusConfig(props.status));
const isInProgress = computed(() => mapEntityStatus(props.status) === 'in_progress');
</script>

<template>
  <UBadge
    :color="(statusConfig.badgeColor as any)"
    variant="subtle"
    size="xs"
    class="font-medium px-2.5 py-0.5 rounded-full"
  >
    <div class="flex items-center gap-1.5">
      <div v-if="isInProgress" class="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      <Icon v-else :name="statusConfig.icon || 'i-heroicons-question-mark-circle'" class="w-3.5 h-3.5" />
      <span>{{ statusConfig.label }}</span>
    </div>
  </UBadge>
</template>
