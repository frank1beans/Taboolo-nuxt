<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  accept?: string; // e.g. ".xml,.six" or "image/*"
  maxSizeMb?: number;
  label?: string;
  sublabel?: string;
  icon?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'file-selected', file: File): void;
  (e: 'error', message: string): void;
}>();

const isDragging = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const onDragOver = (e: DragEvent) => {
  if (props.disabled) return;
  e.preventDefault();
  isDragging.value = true;
};

const onDragLeave = (e: DragEvent) => {
  e.preventDefault();
  isDragging.value = false;
};

const validateFile = (file: File): boolean => {
  // Validate type/extension if needed (simple check)
  if (props.accept) {
    const acceptedExtensions = props.accept.split(',').map(ext => ext.trim().toLowerCase());
    const fileName = file.name.toLowerCase();
    const matches = acceptedExtensions.some(ext => fileName.endsWith(ext));
    if (!matches) {
      emit('error', `Tipo di file non supportato. Accettati: ${props.accept}`);
      return false;
    }
  }

  // Validate size
  if (props.maxSizeMb && file.size > props.maxSizeMb * 1024 * 1024) {
    emit('error', `Il file supera la dimensione massima di ${props.maxSizeMb}MB`);
    return false;
  }

  return true;
};

const onDrop = (e: DragEvent) => {
  if (props.disabled) return;
  e.preventDefault();
  isDragging.value = false;

  const files = e.dataTransfer?.files;
  if (!files || files.length === 0) return;

  const file = files[0];
  if (file && validateFile(file)) {
    emit('file-selected', file);
  }
};

const onFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return;

  const file = target.files[0];
  if (file && validateFile(file)) {
    emit('file-selected', file);
  }
  
  // Reset input to allow selecting the same file again
  target.value = '';
};

const triggerSelect = () => {
  if (props.disabled) return;
  fileInput.value?.click();
};
</script>

<template>
  <div
    class="relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg transition-colors duration-200"
    :class="[
      isDragging ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10' : 'border-gray-300 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500',
      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
    ]"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @click="triggerSelect"
  >
    <input
      ref="fileInput"
      type="file"
      class="hidden"
      :accept="accept"
      :disabled="disabled"
      @change="onFileChange"
    />

    <div class="flex flex-col items-center text-center space-y-3">
      <div 
        class="w-12 h-12 rounded-full flex items-center justify-center transition-colors"
        :class="isDragging ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'"
      >
        <UIcon :name="icon || 'i-heroicons-cloud-arrow-up'" class="w-6 h-6" />
      </div>
      
      <div>
        <p class="text-sm font-medium text-gray-700 dark:text-gray-200">
          {{ label || 'Clicca per caricare o trascina un file qui' }}
        </p>
        <p v-if="sublabel" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {{ sublabel }}
        </p>
      </div>
    </div>
  </div>
</template>
