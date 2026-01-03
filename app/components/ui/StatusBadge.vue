<script setup lang="ts">
/**
 * StatusBadge - Universal status indicator badge
 * 
 * Displays entity status with consistent styling using centralized status config.
 * Supports multiple entity types: project, conflict, offer, import.
 * 
 * Can be used directly with status prop or as AG Grid cellRenderer (via params prop).
 */
import { computed } from 'vue';
import { getStatusConfig, mapEntityStatus, type EntityType } from '~/utils/status-config';

interface CellRendererParams {
  value?: string;
  data?: { status?: string };
}

const props = withDefaults(defineProps<{
  /** Status value (e.g., 'in_progress', 'pending', 'draft') */
  status?: string;
  /** AG Grid cell renderer params (alternative to status prop) */
  params?: CellRendererParams;
  /** Entity type for status mapping */
  entity?: EntityType;
  /** Badge size */
  size?: 'xs' | 'sm' | 'md';
  /** Show icon */
  showIcon?: boolean;
}>(), {
  entity: 'project',
  size: 'xs',
  showIcon: true,
});

// Resolve status from either direct prop or AG Grid params
const resolvedStatus = computed(() => {
  if (props.status) return props.status;
  if (props.params?.value) return String(props.params.value);
  if (props.params?.data?.status) return props.params.data.status;
  return undefined;
});

const statusConfig = computed(() => getStatusConfig(resolvedStatus.value, props.entity));
const isInProgress = computed(() => {
  if (props.entity === 'project') {
    return mapEntityStatus(resolvedStatus.value) === 'in_progress';
  }
  return resolvedStatus.value?.toLowerCase() === 'processing';
});
</script>

<template>
  <UBadge
    :color="(statusConfig.badgeColor as any)"
    variant="subtle"
    :size="size"
    class="font-medium px-2.5 py-0.5 rounded-full"
  >
    <div class="flex items-center gap-1.5">
      <!-- Animated dot for in-progress states -->
      <div 
        v-if="isInProgress && showIcon" 
        class="w-1.5 h-1.5 rounded-full bg-current animate-pulse" 
      />
      <!-- Static icon for other states -->
      <Icon 
        v-else-if="showIcon && statusConfig.icon" 
        :name="statusConfig.icon" 
        class="w-3.5 h-3.5" 
      />
      <span>{{ statusConfig.label }}</span>
    </div>
  </UBadge>
</template>
