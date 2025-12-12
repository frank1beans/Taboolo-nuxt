<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { useCreateProject } from '@/composables/queries/useProjectQueries'

type ProjectStatus = 'setup' | 'in_progress' | 'closed'

interface Props {
  open?: boolean
}

interface Emits {
  (e: 'update:open', value: boolean): void
}

const props = withDefaults(defineProps<Props>(), {
  open: false,
})

const emit = defineEmits<Emits>()

const BUSINESS_UNITS = [
  'ECLETTICO',
  'L22 HOSPITALITY',
  'L22 LIVING',
  'L22 EDU',
  'L22 RETAIL',
  'DEGW',
  'L22 U&B',
  'L22 TERRITORIO',
  'L22 CE',
  'L22 DC',
]

interface ProjectFormData {
  name: string
  code: string
  description: string
  business_unit: string
  revision: string
  status: ProjectStatus
}

const modalOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

const formData = ref<ProjectFormData>({
  name: '',
  code: '',
  description: '',
  business_unit: '',
  revision: '',
  status: 'setup',
})

const errors = ref<Partial<Record<keyof ProjectFormData, string>>>({})

const { mutateAsync: createProject, isPending: isSubmitting } = useCreateProject()
const isSubmittingBool = computed(() => !!isSubmitting.value)

const businessUnitOptions = computed(() =>
  BUSINESS_UNITS.map((unit) => ({
    label: unit,
    value: unit,
  })),
)

const statusOptions = [
  { value: 'setup', label: 'Setup' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'closed', label: 'Closed' },
]

const validateForm = () => {
  errors.value = {}

  if (!formData.value.name?.trim()) {
    errors.value.name = 'Il nome del progetto è obbligatorio'
  }

  if (!formData.value.code?.trim()) {
    errors.value.code = 'Il codice del progetto è obbligatorio'
  } else if (!/^[A-Z0-9_-]+$/i.test(formData.value.code)) {
    errors.value.code = 'Il codice può contenere solo lettere, numeri, trattini e underscore'
  }

  if (!formData.value.description?.trim()) {
    errors.value.description = 'La descrizione è obbligatoria'
  }

  return Object.keys(errors.value).length === 0
}

const resetForm = () => {
  formData.value = {
    name: '',
    code: '',
    description: '',
    business_unit: '',
    revision: '',
    status: 'setup',
  }
  errors.value = {}
}

const handleSubmit = async () => {
  if (!validateForm()) {
    toast.error('Correggi gli errori nel form', {
      description: 'Alcuni campi obbligatori sono mancanti o non validi',
    })
    return
  }

  try {
    const payload = {
      name: formData.value.name.trim(),
      code: formData.value.code.trim().toUpperCase(),
      description: formData.value.description.trim() || null,
      business_unit: formData.value.business_unit || null,
      revision: formData.value.revision?.trim() || null,
      status: formData.value.status,
    }

    const project = await createProject(payload)
    toast.success('Progetto creato con successo', {
      description: `${project.name} - ${project.code}`,
    })
    resetForm()
    modalOpen.value = false
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ''
    const statusCode = typeof error === 'object' && error && 'statusCode' in error
      ? (error as { statusCode?: number }).statusCode
      : undefined

    if (message.includes('already exists') || statusCode === 409) {
      errors.value.code = 'Questo codice progetto esiste già'
      toast.error('Codice progetto duplicato', {
        description: 'Un progetto con questo codice esiste già. Scegline uno diverso.',
      })
    } else {
      toast.error('Errore durante la creazione', {
        description: message || 'Impossibile creare il progetto',
      })
    }
  }
}

watch(() => props.open, (value) => {
  if (!value) {
    resetForm()
  }
})
</script>

<template>
  <UModal
    v-model="modalOpen"
    :ui="{
      wrapper: 'z-[9999]',
      overlay: 'bg-black/50'
    }"
  >
      <template #header>
        <div class="space-y-1">
          <p class="text-xs uppercase tracking-[0.16em] text-muted-foreground">Metadati progetto</p>
          <h3 class="text-lg font-semibold text-foreground">Crea nuovo progetto</h3>
          <p class="text-sm text-muted-foreground">
            I campi contrassegnati con <span class="font-semibold text-destructive">*</span> sono obbligatori.
          </p>
        </div>
      </template>

      <div class="space-y-5">
        <UFormField label="Nome progetto" required :error="errors.name">
          <UInput
            v-model="formData.name"
            placeholder="es. Ristrutturazione Palazzo Comunale"
            :disabled="isSubmittingBool"
          />
        </UFormField>

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Codice progetto" required :error="errors.code">
            <UInput
              v-model="formData.code"
              placeholder="es. PROG-001"
              :disabled="isSubmittingBool"
              @blur="formData.code = formData.code.toUpperCase()"
            />
            <p class="text-[11px] text-muted-foreground">Codice univoco alfanumerico</p>
          </UFormField>

          <UFormField label="Business unit">
            <USelectMenu
              v-model="formData.business_unit"
              :options="businessUnitOptions"
              value-attribute="value"
              option-attribute="label"
              placeholder="Seleziona business unit"
              searchable
              clearable
              :disabled="isSubmittingBool"
            />
            <p class="text-[11px] text-muted-foreground">Opzionale</p>
          </UFormField>
        </div>

        <UFormField label="Descrizione" required :error="errors.description">
          <UTextarea
            v-model="formData.description"
            :rows="3"
            placeholder="Breve descrizione del progetto..."
            :disabled="isSubmittingBool"
          />
        </UFormField>

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Revisione">
            <UInput
              v-model="formData.revision"
              placeholder="es. Rev. A"
              :disabled="isSubmittingBool"
            />
          </UFormField>

          <UFormField label="Stato">
            <USelectMenu
              v-model="formData.status"
              :options="statusOptions"
              value-attribute="value"
              option-attribute="label"
              :disabled="isSubmittingBool"
            />
          </UFormField>
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <UButton color="neutral" variant="ghost" :disabled="isSubmittingBool" @click="modalOpen = false">
            Annulla
          </UButton>
          <UButton color="primary" :loading="isSubmittingBool" @click="handleSubmit">
            Crea progetto
          </UButton>
        </div>
      </template>
  </UModal>
</template>
