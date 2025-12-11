<script setup lang="ts">
import { ref, computed, watch } from 'vue'

export interface BatchUploadRowData {
  id: string
  file: File | null
  sheet: string | null
  enterprise: string
  round: string
  status: 'idle' | 'uploading' | 'success' | 'error'
  error?: string
  progress?: number
}

export interface BatchUploadRowProps {
  data: BatchUploadRowData
  availableSheets?: string[]
  disabled?: boolean
}

const props = withDefaults(defineProps<BatchUploadRowProps>(), {
  availableSheets: () => [],
  disabled: false,
})

const emit = defineEmits<{
  update: [data: Partial<BatchUploadRowData>]
  remove: []
  fileSelect: [file: File]
}>()

const fileInputRef = ref<HTMLInputElement>()

const { parseFile, getSheetNames } = useExcelParser()
const sheets = ref<string[]>(props.availableSheets)

const statusIcon = computed(() => {
  switch (props.data.status) {
    case 'uploading':
      return 'i-lucide-loader-2'
    case 'success':
      return 'i-lucide-check-circle-2'
    case 'error':
      return 'i-lucide-x-circle'
    default:
      return null
  }
})

const statusColor = computed(() => {
  switch (props.data.status) {
    case 'uploading':
      return 'text-blue-500'
    case 'success':
      return 'text-green-500'
    case 'error':
      return 'text-destructive'
    default:
      return 'text-muted-foreground'
  }
})

const isDisabled = computed(() => {
  return props.disabled || props.data.status === 'uploading' || props.data.status === 'success'
})

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  emit('update', { file })
  emit('fileSelect', file)

  // Parse Excel to get sheets
  try {
    await parseFile(file)
    sheets.value = getSheetNames()

    // Auto-select first sheet if available
    if (sheets.value.length > 0) {
      emit('update', { sheet: sheets.value[0] })
    }
  } catch (error) {
    console.error('Error parsing Excel:', error)
  }

  // Reset input
  if (target) {
    target.value = ''
  }
}

const openFilePicker = () => {
  if (!isDisabled.value) {
    fileInputRef.value?.click()
  }
}

const handleUpdate = <K extends keyof BatchUploadRowData>(key: K, value: BatchUploadRowData[K]) => {
  emit('update', { [key]: value })
}

const handleRemove = () => {
  if (!isDisabled.value) {
    emit('remove')
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const sheetOptions = computed(() => {
  return sheets.value.map(sheet => ({
    value: sheet,
    label: sheet
  }))
})

// Watch for external sheet updates
watch(
  () => props.availableSheets,
  (newSheets) => {
    sheets.value = newSheets
  }
)
</script>

<template>
  <div
    class="group flex items-center gap-3 rounded-lg border p-3 transition-all"
    :class="{
      'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900':
        data.status === 'uploading',
      'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900':
        data.status === 'success',
      'bg-destructive/10 border-destructive': data.status === 'error',
      'hover:border-primary/50': data.status === 'idle' && !isDisabled,
    }"
  >
    <!-- Status Icon -->
    <div class="shrink-0">
      <UIcon
        v-if="statusIcon"
        :name="statusIcon"
        class="h-5 w-5 transition-all"
        :class="[statusColor, { 'animate-spin': data.status === 'uploading' }]"
      />
      <UIcon v-else name="i-lucide-file" class="h-5 w-5 text-muted-foreground" />
    </div>

    <!-- File Selection -->
    <div class="flex-1 min-w-0 space-y-2">
      <div class="flex items-center gap-2">
        <input
          ref="fileInputRef"
          type="file"
          accept=".xlsx,.xls"
          class="hidden"
          :disabled="isDisabled"
          @change="handleFileSelect"
        >
        <Button
          size="sm"
          variant="outline"
          :disabled="isDisabled"
          class="text-xs"
          @click="openFilePicker"
        >
          {{ data.file ? 'Cambia File' : 'Seleziona File' }}
        </Button>
        <div v-if="data.file" class="flex-1 min-w-0">
          <p class="text-xs font-medium truncate">{{ data.file.name }}</p>
          <p class="text-xs text-muted-foreground">{{ formatFileSize(data.file.size) }}</p>
        </div>
      </div>

      <!-- Configuration Row -->
      <div class="grid grid-cols-3 gap-2">
        <!-- Sheet Selector -->
        <div class="space-y-1">
          <Label class="text-xs">Foglio</Label>
          <Select
            :model-value="data.sheet || ''"
            :options="sheetOptions"
            placeholder="-- Seleziona --"
            :disabled="isDisabled || sheets.length === 0"
            @update:model-value="(val: string) => handleUpdate('sheet', val)"
          />
        </div>

        <!-- Enterprise -->
        <div class="space-y-1">
          <Label class="text-xs">Impresa</Label>
          <Input
            :model-value="data.enterprise"
            :disabled="isDisabled"
            placeholder="Nome impresa..."
            @update:model-value="(val: string) => handleUpdate('enterprise', String(val))"
          />
        </div>

        <!-- Round -->
        <div class="space-y-1">
          <Label class="text-xs">Round</Label>
          <Input
            :model-value="data.round"
            :disabled="isDisabled"
            placeholder="Es: R1, R2..."
            @update:model-value="(val: string) => handleUpdate('round', String(val))"
          />
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="data.status === 'error' && data.error" class="flex items-start gap-2">
        <p class="text-xs text-destructive">{{ data.error }}</p>
      </div>

      <!-- Progress Bar -->
      <div v-if="data.status === 'uploading' && data.progress !== undefined" class="space-y-1">
        <div class="flex items-center justify-between text-xs">
          <span class="text-muted-foreground">Caricamento...</span>
          <span class="font-medium">{{ Math.round(data.progress) }}%</span>
        </div>
        <div class="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            class="h-full bg-primary transition-all duration-300"
            :style="{ width: `${data.progress}%` }"
          />
        </div>
      </div>
    </div>

    <!-- Remove Button -->
    <button
      type="button"
      class="shrink-0 p-1.5 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="isDisabled"
      @click="handleRemove"
    >
      <UIcon name="i-lucide-trash-2" class="h-4 w-4" />
    </button>
  </div>
</template>
