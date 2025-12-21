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
    estimateId?: string;
  };
  actionLabel?: string;
}>();

defineEmits<(e: 'reset' | 'action') => void>();

const statusConfig = computed(() => {
  switch (props.status) {
    case 'uploading':
      return { icon: 'i-heroicons-arrow-path', color: 'text-[hsl(var(--info))]', title: 'Caricamento in corso...' };
    case 'processing':
      return { icon: 'i-heroicons-cog-6-tooth', color: 'text-[hsl(var(--warning))]', title: 'Elaborazione file...' };
    case 'success':
      return { icon: 'i-heroicons-check-circle', color: 'text-[hsl(var(--success))]', title: 'Import completato' };
    case 'error':
      return { icon: 'i-heroicons-x-circle', color: 'text-[hsl(var(--destructive))]', title: 'Errore durante l\'import' };
    default:
      return { icon: 'i-heroicons-document', color: 'text-[hsl(var(--muted-foreground))]', title: 'Pronto' };
  }
});
</script>

<template>
  <UCard v-if="status !== 'idle'" class="w-full border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
    <div class="flex items-start gap-4">
      <!-- Icon Wrapper -->
      <div 
        class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-[hsl(var(--secondary))]"
      >
        <UIcon 
          :name="statusConfig.icon" 
          class="w-6 h-6" 
          :class="[statusConfig.color, (status === 'uploading' || status === 'processing') ? 'animate-spin' : '']" 
        />
      </div>

      <!-- Content -->
      <div class="flex-1 min-w-0">
        <h4 class="text-sm font-medium text-[hsl(var(--foreground))]">
          {{ statusConfig.title }}
        </h4>
        
        <p v-if="fileName" class="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 truncate">
          {{ fileName }}
        </p>

        <!-- Progress Bar (for uploading/processing) -->
        <div v-if="status === 'uploading' || status === 'processing'" class="mt-3 w-full bg-[hsl(var(--muted))] rounded-full h-1.5 overflow-hidden">
          <div 
            class="bg-[hsl(var(--primary))] h-1.5 rounded-full transition-all duration-300" 
            :style="{ width: `${progress || 0}%` }"
          />
        </div>

        <!-- Success Details -->
        <div v-if="status === 'success' && result" class="mt-2 text-sm text-[hsl(var(--foreground)/0.8)] space-y-1">
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
        <div v-if="status === 'error' && errorMessage" class="mt-2 p-2 rounded bg-[hsl(var(--destructive-light))] text-[hsl(var(--destructive))] text-xs">
          {{ errorMessage }}
        </div>
      </div>

      <!-- Actions -->
      <div class="flex-shrink-0 flex items-center gap-2">
         <UButton 
          v-if="status === 'success' && actionLabel"
          color="primary" 
          variant="soft" 
          :label="actionLabel"
          size="xs"
          @click="$emit('action')"
        />
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
