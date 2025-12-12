<script setup lang="ts">
import { ref, computed } from 'vue'
import { toast } from 'vue-sonner'
import { useUploadEstimate } from '@/composables/queries/useEstimateQueries'

export interface ComputoProgettoUploadProps {
  projectId: string | number
  open?: boolean
}

const props = withDefaults(defineProps<ComputoProgettoUploadProps>(), {
  open: false,
})

const emit = defineEmits<{
  close: []
  success: []
}>()

// Form state
const file = ref<File | null>(null)
const discipline = ref<string>('')
const revision = ref<string>('')
const isBaseline = ref(false)

// Upload mutation
const { mutate: uploadEstimate, isPending } = useUploadEstimate()

// Validation
const isValid = computed(() => {
  return file.value !== null && file.value.name.length > 0
})

const handleFileSelect = (selectedFile: File | File[]) => {
  if (Array.isArray(selectedFile)) {
    file.value = selectedFile[0]
  } else {
    file.value = selectedFile
  }
}

const handleFileError = (message: string) => {
  toast.error(message)
}

const handleSubmit = () => {
  if (!isValid.value || !file.value) {
    toast.error('Seleziona un file da caricare')
    return
  }

  uploadEstimate(
    {
      projectId: props.projectId,
      file: file.value,
      discipline: discipline.value || undefined,
      revision: revision.value || undefined,
      isBaseline: isBaseline.value,
    },
    {
      onSuccess: () => {
        emit('success')
        handleClose()
      },
    }
  )
}

const handleClose = () => {
  // Reset form
  file.value = null
  discipline.value = ''
  revision.value = ''
  isBaseline.value = false
  emit('close')
}
</script>

<template>
  <Dialog :open="open" @update:open="(val) => !val && handleClose()">
    <div class="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Carica Computo Progetto</DialogTitle>
        <DialogDescription>
          Carica il computo del progetto (Excel/CSV) per creare la baseline o una revisione.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-6 py-4">
        <!-- File Upload -->
        <div class="space-y-2">
          <Label>File Computo *</Label>
          <UploadArea
            v-model="file"
            accept=".xlsx,.xls,.csv"
            :max-size="20 * 1024 * 1024"
            :disabled="isPending"
            @select="handleFileSelect"
            @error="handleFileError"
          />
        </div>

        <!-- Discipline -->
        <div class="space-y-2">
          <Label for="discipline">Disciplina</Label>
          <Input
            id="discipline"
            v-model="discipline"
            type="text"
            placeholder="Es: Architettonico, Strutturale, Impianti..."
            :disabled="isPending"
          />
          <p class="text-xs text-muted-foreground">
            Opzionale - Specifica la disciplina del computo
          </p>
        </div>

        <!-- Revision -->
        <div class="space-y-2">
          <Label for="revision">Revisione</Label>
          <Input
            id="revision"
            v-model="revision"
            type="text"
            placeholder="Es: Rev.0, Rev.1, Rev.A..."
            :disabled="isPending"
          />
          <p class="text-xs text-muted-foreground">
            Opzionale - Identificativo della revisione del computo
          </p>
        </div>

        <!-- Baseline Flag -->
        <div class="flex items-center space-x-2">
          <Checkbox id="baseline" v-model:checked="isBaseline" :disabled="isPending" />
          <Label
            for="baseline"
            class="text-sm font-normal cursor-pointer"
            :class="{ 'opacity-50': isPending }"
          >
            Imposta come baseline del progetto
          </Label>
        </div>
        <p class="text-xs text-muted-foreground ml-6">
          La baseline è il riferimento principale per i confronti e le analisi
        </p>
      </div>

      <DialogFooter>
        <Button variant="outline" :disabled="isPending" @click="handleClose"> Annulla </Button>
        <Button :disabled="!isValid || isPending" @click="handleSubmit">
          <UIcon v-if="isPending" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
          Carica Computo
        </Button>
      </DialogFooter>
    </div>
  </Dialog>
</template>
