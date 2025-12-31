<script setup lang="ts">
/**
 * ConfirmModal.vue
 * 
 * A reusable confirmation modal component with customizable title, message,
 * and action buttons. Supports different variants (danger, warning, info).
 */

type ConfirmVariant = 'danger' | 'warning' | 'info';

const props = withDefaults(defineProps<{
  open: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  loading?: boolean;
}>(), {
  title: 'Conferma',
  message: 'Sei sicuro di voler procedere?',
  confirmLabel: 'Conferma',
  cancelLabel: 'Annulla',
  variant: 'danger',
  loading: false,
});

const emit = defineEmits<{
  'confirm': [];
  'cancel': [];
  'update:open': [value: boolean];
}>();

const variantConfig = computed(() => {
  switch (props.variant) {
    case 'warning':
      return {
        bgHeader: 'bg-amber-50 dark:bg-amber-950/30',
        iconBg: 'bg-amber-100 dark:bg-amber-900/50',
        iconColor: 'text-amber-600 dark:text-amber-400',
        icon: 'heroicons:exclamation-triangle',
        buttonColor: 'warning' as const,
      };
    case 'info':
      return {
        bgHeader: 'bg-blue-50 dark:bg-blue-950/30',
        iconBg: 'bg-blue-100 dark:bg-blue-900/50',
        iconColor: 'text-blue-600 dark:text-blue-400',
        icon: 'heroicons:information-circle',
        buttonColor: 'primary' as const,
      };
    case 'danger':
    default:
      return {
        bgHeader: 'bg-rose-50 dark:bg-rose-950/30',
        iconBg: 'bg-rose-100 dark:bg-rose-900/50',
        iconColor: 'text-rose-600 dark:text-rose-400',
        icon: 'heroicons:trash',
        buttonColor: 'error' as const,
      };
  }
});

const handleConfirm = () => {
  emit('confirm');
};

const handleCancel = () => {
  emit('cancel');
  emit('update:open', false);
};

const handleBackdropClick = () => {
  if (!props.loading) {
    handleCancel();
  }
};
</script>

<template>
  <Teleport to="body">
    <div 
      v-if="open" 
      class="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6"
    >
      <!-- Backdrop -->
      <div 
        class="absolute inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm transition-opacity"
        @click="handleBackdropClick"
      />

      <!-- Modal Card -->
      <div class="relative z-[105] w-full max-w-md rounded-xl shadow-2xl overflow-hidden bg-[hsl(var(--card))] border border-[hsl(var(--border))] flex flex-col">
        
        <!-- Header -->
        <div :class="['px-6 py-4 border-b border-[hsl(var(--border))] flex items-center gap-3', variantConfig.bgHeader]">
          <div :class="['w-10 h-10 rounded-full flex items-center justify-center', variantConfig.iconBg]">
            <Icon :name="variantConfig.icon" :class="['w-5 h-5', variantConfig.iconColor]" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-[hsl(var(--foreground))]">{{ title }}</h3>
          </div>
        </div>

        <!-- Body -->
        <div class="p-6">
          <slot>
            <p class="text-[hsl(var(--foreground))]">{{ message }}</p>
          </slot>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.5)] flex items-center justify-end gap-3">
          <UButton 
            color="neutral" 
            variant="ghost" 
            :disabled="loading"
            @click="handleCancel"
          >
            {{ cancelLabel }}
          </UButton>
          <UButton 
            :color="variantConfig.buttonColor" 
            :icon="loading ? 'i-heroicons-arrow-path' : undefined"
            :loading="loading"
            @click="handleConfirm"
          >
            {{ confirmLabel }}
          </UButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>
