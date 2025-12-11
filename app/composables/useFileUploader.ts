import { ref } from 'vue'
import type { Ref } from 'vue'

export interface UseFileUploaderOptions {
  accept?: string
  maxSize?: number // in bytes
  multiple?: boolean
}

export interface FileUploaderState {
  file: Ref<File | null>
  files: Ref<File[]>
  progress: Ref<number>
  isUploading: Ref<boolean>
  error: Ref<string | null>
  isDragging: Ref<boolean>
}

/**
 * Composable for file upload functionality
 * Centralizes upload logic, validation, and progress tracking
 */
export const useFileUploader = (options: UseFileUploaderOptions = {}) => {
  const file = ref<File | null>(null)
  const files = ref<File[]>([])
  const progress = ref(0)
  const isUploading = ref(false)
  const error = ref<string | null>(null)
  const isDragging = ref(false)

  /**
   * Validate file against constraints
   */
  const validateFile = (fileToValidate: File): boolean => {
    error.value = null

    // Check file type
    if (options.accept) {
      const acceptedTypes = options.accept.split(',').map((t) => t.trim())
      const fileExtension = '.' + fileToValidate.name.split('.').pop()?.toLowerCase()
      const mimeType = fileToValidate.type

      const isAccepted = acceptedTypes.some((type) => {
        if (type.startsWith('.')) {
          return fileExtension === type.toLowerCase()
        }
        if (type.endsWith('/*')) {
          const baseType = type.split('/')[0]
          return mimeType.startsWith(baseType + '/')
        }
        return mimeType === type
      })

      if (!isAccepted) {
        error.value = `Tipo di file non supportato. Formati accettati: ${options.accept}`
        return false
      }
    }

    // Check file size
    if (options.maxSize && fileToValidate.size > options.maxSize) {
      const maxSizeMB = (options.maxSize / (1024 * 1024)).toFixed(2)
      error.value = `Il file e' troppo grande. Dimensione massima: ${maxSizeMB}MB`
      return false
    }

    return true
  }

  /**
   * Select a single file
   */
  const selectFile = (selectedFile: File): boolean => {
    if (!validateFile(selectedFile)) {
      return false
    }

    file.value = selectedFile
    if (!options.multiple) {
      files.value = [selectedFile]
    }
    return true
  }

  /**
   * Select multiple files
   */
  const selectFiles = (selectedFiles: File[]): boolean => {
    const validFiles: File[] = []

    for (const f of selectedFiles) {
      if (validateFile(f)) {
        validFiles.push(f)
      }
    }

    if (validFiles.length === 0) {
      return false
    }

    files.value = validFiles
    if (validFiles.length > 0) {
      file.value = validFiles[0]
    }

    return true
  }

  /**
   * Handle file input change
   */
  const onFileChange = (event: Event) => {
    const target = event.target as HTMLInputElement
    const selectedFiles = target.files

    if (!selectedFiles || selectedFiles.length === 0) {
      return
    }

    if (options.multiple) {
      selectFiles(Array.from(selectedFiles))
    } else {
      selectFile(selectedFiles[0])
    }
  }

  /**
   * Handle drag and drop
   */
  const onDrop = (event: DragEvent) => {
    isDragging.value = false
    const droppedFiles = event.dataTransfer?.files

    if (!droppedFiles || droppedFiles.length === 0) {
      return
    }

    if (options.multiple) {
      selectFiles(Array.from(droppedFiles))
    } else {
      selectFile(droppedFiles[0])
    }
  }

  const onDragOver = (event: DragEvent) => {
    event.preventDefault()
    isDragging.value = true
  }

  const onDragLeave = () => {
    isDragging.value = false
  }

  const getErrorMessage = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback

  /**
   * Execute upload with progress tracking
   */
  const upload = async <T = unknown>(
    uploadFn: (file: File, onProgress?: (progress: number) => void) => Promise<T>
  ): Promise<T | null> => {
    if (!file.value) {
      error.value = 'Nessun file selezionato'
      return null
    }

    isUploading.value = true
    error.value = null
    progress.value = 0

    try {
      const result = await uploadFn(file.value, (p: number) => {
        progress.value = p
      })
      progress.value = 100
      return result
    } catch (e) {
      error.value = getErrorMessage(e, 'Errore durante il caricamento del file')
      throw e
    } finally {
      isUploading.value = false
    }
  }

  /**
   * Execute batch upload for multiple files
   */
  const uploadBatch = async <T = unknown>(
    uploadFn: (file: File, index: number, onProgress?: (progress: number) => void) => Promise<T>
  ): Promise<T[]> => {
    if (files.value.length === 0) {
      error.value = 'Nessun file selezionato'
      return []
    }

    isUploading.value = true
    error.value = null
    progress.value = 0

    const results: T[] = []
    const total = files.value.length

    try {
      for (let i = 0; i < files.value.length; i++) {
        const fileResult = await uploadFn(files.value[i], i, (fileProgress: number) => {
          // Calculate overall progress
          const completedFiles = i
          const currentFileProgress = fileProgress / 100
          progress.value = ((completedFiles + currentFileProgress) / total) * 100
        })
        results.push(fileResult)
      }

      progress.value = 100
      return results
    } catch (e) {
      error.value = getErrorMessage(e, 'Errore durante il caricamento dei file')
      throw e
    } finally {
      isUploading.value = false
    }
  }

  /**
   * Reset upload state
   */
  const reset = () => {
    file.value = null
    files.value = []
    progress.value = 0
    error.value = null
    isUploading.value = false
    isDragging.value = false
  }

  /**
   * Remove file from selection
   */
  const removeFile = (index: number) => {
    files.value.splice(index, 1)
    if (files.value.length === 0) {
      file.value = null
    } else if (file.value === files.value[index]) {
      file.value = files.value[0]
    }
  }

  return {
    // State
    file,
    files,
    progress,
    isUploading,
    error,
    isDragging,

    // Methods
    selectFile,
    selectFiles,
    onFileChange,
    onDrop,
    onDragOver,
    onDragLeave,
    upload,
    uploadBatch,
    reset,
    removeFile,
    validateFile,
  }
}
