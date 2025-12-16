<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
  fileName?: string;
  errorMessage?: string;
  progress?: number;
  result?: {
    totalItems?: number;
    wbsNodes?: number;
    message?: string;
  };
}>();

const emit = defineEmits<{
  (e: 'reset'): void;
  (e: 'view-details'): void;
}>();

const statusConfig = computed(() => {
  switch (props.status) {
    case 'uploading':
      return { icon: 'i-heroicons-arrow-path', color: 'text-blue-500', title: 'Caricamento in corso...' };
    case 'processing':
      return { icon: 'i-heroicons-cog-6-tooth', color: 'text-amber-500', title: 'Elaborazione file...' };
    case 'success':
      return { icon: 'i-heroicons-check-circle', color: 'text-green-500', title: 'Import completato' };
    case 'error':
      return { icon: 'i-heroicons-x-circle', color: 'text-red-500', title: 'Errore durante l\'import' };
    default:
      return { icon: 'i-heroicons-document', color: 'text-gray-400', title: 'Pronto' };
  }
});
</script>

<template>
  <UCard v-if="status !== 'idle'" class="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
    <div class="flex items-start gap-4">
      <!-- Icon Wrapper -->
      <div 
        class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 dark:bg-gray-700/50"
      >
        <UIcon 
          :name="statusConfig.icon" 
          class="w-6 h-6" 
          :class="[statusConfig.color, (status === 'uploading' || status === 'processing') ? 'animate-spin' : '']" 
        />
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <h4 class="text-sm font-medium text-gray-900 dark:text-white">
          {{ statusConfig.title }}
        </h4>
        
        <p v-if="fileName" class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
          {{ fileName }}
        </p>

        <!-- Progress Bar (for uploading/processing) -->
        <div v-if="status === 'uploading' || status === 'processing'" class="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
          <div 
            class="bg-primary-500 h-1.5 rounded-full transition-all duration-300" 
            :style="{ width: `${progress || 0}%` }"
          ></div>
        </div>

        <!-- Success Details -->
        <div v-if="status === 'success' && result" class="mt-2 text-sm text-gray-600 dark:text-gray-300 space-y-1">
          <p v-if="result.message">{{ result.message }}</p>
          <div class="flex flex-wrap gap-2 mt-2">
            <UBadge v-if="result.totalItems" color="primary" variant="subtle" size="xs">
              {{ result.totalItems }} Voci importate
            </UBadge>
            <UBadge v-if="result.wbsNodes" color="neutral" variant="subtle" size="xs">
              {{ result.wbsNodes }} Nodi WBS
            </UBadge>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="status === 'error' && errorMessage" class="mt-2 p-2 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs">
          {{ errorMessage }}
        </div>
      </div>

      <!-- Actions -->
      <div class="flex-shrink-0 flex items-center gap-2">
         <UButton 
          v-if="status === 'success' || status === 'error'"
          color="neutral" 
          variant="ghost" 
          icon="i-heroicons-x-mark"
          size="xs"
          @click="$emit('reset')"
        />
      </div>
    </div>
  </UCard>
</template>
