<script setup lang="ts">
import { ref, computed } from 'vue'
import { UIcon } from '#components'

export interface UploadAreaProps {
  accept?: string
  maxSize?: number
  multiple?: boolean
  disabled?: boolean
  modelValue?: File | File[] | null
  showPreview?: boolean
}

const props = withDefaults(defineProps<UploadAreaProps>(), {
  accept: '*/*',
  maxSize: 50 * 1024 * 1024, // 50MB default
  multiple: false,
  disabled: false,
  modelValue: null,
  showPreview: true,
})

const emit = defineEmits<{
  'update:modelValue': [file: File | File[] | null]
  select: [file: File | File[]]
  error: [message: string]
}>()

const { isDragging, onDrop, onDragOver, onDragLeave, validateFile } = useFileUploader({
  accept: props.accept,
  maxSize: props.maxSize,
  multiple: props.multiple,
})

const fileInputRef = ref<HTMLInputElement>()

const selectedFiles = computed(() => {
  if (!props.modelValue) return []
  if (Array.isArray(props.modelValue)) return props.modelValue
  return [props.modelValue]
})

const maxSizeMB = computed(() => {
  return (props.maxSize / (1024 * 1024)).toFixed(0)
})

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files

  if (!files || files.length === 0) return

  const filesArray = Array.from(files)
  const validFiles: File[] = []

  for (const file of filesArray) {
    if (validateFile(file)) {
      validFiles.push(file)
    } else {
      // Emit error for invalid files
      const error = validateFile(file) ? '' : 'File non valido'
      emit('error', error)
    }
  }

  if (validFiles.length > 0) {
    const result = props.multiple ? validFiles : validFiles[0]
    emit('update:modelValue', result)
    emit('select', result)
  }

  // Reset input
  if (target) {
    target.value = ''
  }
}

const handleDrop = (event: DragEvent) => {
  if (props.disabled) return

  onDrop(event)
  const files = event.dataTransfer?.files

  if (!files || files.length === 0) return

  const filesArray = Array.from(files)
  const validFiles: File[] = []

  for (const file of filesArray) {
    if (validateFile(file)) {
      validFiles.push(file)
    }
  }

  if (validFiles.length > 0) {
    const result = props.multiple ? validFiles : validFiles[0]
    emit('update:modelValue', result)
    emit('select', result)
  }
}

const handleDragOver = (event: DragEvent) => {
  if (!props.disabled) {
    onDragOver(event)
  }
}

const openFilePicker = () => {
  if (!props.disabled) {
    fileInputRef.value?.click()
  }
}

const removeFile = (index: number) => {
  if (props.multiple && Array.isArray(props.modelValue)) {
    const newFiles = [...props.modelValue]
    newFiles.splice(index, 1)
    emit('update:modelValue', newFiles.length > 0 ? newFiles : null)
  } else {
    emit('update:modelValue', null)
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<template>
  <div class="space-y-3">
    <!-- Upload Area -->
    <div
      class="relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer"
      :class="{
        'border-primary bg-primary/5': isDragging && !disabled,
        'border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/30':
          !isDragging && !disabled,
        'border-muted bg-muted/10 cursor-not-allowed opacity-60': disabled,
      }"
      @click="openFilePicker"
      @drop.prevent="handleDrop"
      @dragover.prevent="handleDragOver"
      @dragleave="onDragLeave"
    >
      <input
        ref="fileInputRef"
        type="file"
        :accept="accept"
        :multiple="multiple"
        :disabled="disabled"
        class="hidden"
        @change="handleFileSelect"
      >

      <div class="flex flex-col items-center gap-3">
        <div
          class="rounded-full p-3 transition-colors"
          :class="
            isDragging && !disabled
              ? 'bg-primary/10 text-primary'
              : 'bg-muted/50 text-muted-foreground'
          "
        >
          <UIcon name="i-lucide-upload" class="h-6 w-6" />
        </div>

        <div class="space-y-1">
          <p class="text-sm font-medium">
            <span v-if="!disabled" class="text-primary">Clicca per caricare</span>
            <span v-else class="text-muted-foreground">Caricamento disabilitato</span>
            <span v-if="!disabled" class="text-muted-foreground"> o trascina qui il file</span>
          </p>
          <p class="text-xs text-muted-foreground">
            {{ accept !== '*/*' ? `Formati: ${accept}` : 'Tutti i formati' }}
            <span v-if="maxSize"> • Max {{ maxSizeMB }}MB</span>
            <span v-if="multiple"> • Caricamento multiplo</span>
          </p>
        </div>
      </div>
    </div>

    <!-- File Preview -->
    <div v-if="showPreview && selectedFiles.length > 0" class="space-y-2">
      <p class="text-xs font-medium text-muted-foreground">
        File selezionati ({{ selectedFiles.length }})
      </p>
      <div class="space-y-2">
        <div
          v-for="(file, index) in selectedFiles"
          :key="index"
          class="flex items-center gap-3 rounded-lg border bg-card p-3"
        >
          <div class="flex-shrink-0 rounded bg-primary/10 p-2 text-primary">
            <UIcon name="i-lucide-file" class="h-4 w-4" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">{{ file.name }}</p>
            <p class="text-xs text-muted-foreground">{{ formatFileSize(file.size) }}</p>
          </div>
          <button
            v-if="!disabled"
            type="button"
            class="flex-shrink-0 rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            @click.stop="removeFile(index)"
          >
            <UIcon name="i-lucide-x" class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
