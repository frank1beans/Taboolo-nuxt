<script setup lang="ts">
import { computed } from 'vue';
import type { ProjectFormState } from '~/composables/useProjectForm';

const props = defineProps<{
  mode: 'create' | 'edit';
}>();

const open = defineModel<boolean>('open', { required: true });
const form = defineModel<ProjectFormState>('form', { required: true });

const emit = defineEmits<{
  submit: [];
}>();

const title = computed(() => (props.mode === 'create' ? 'Nuovo progetto' : 'Modifica progetto'));
const submitLabel = computed(() => (props.mode === 'create' ? 'Crea progetto' : 'Salva modifiche'));

const handleSubmit = () => emit('submit');
const handleClose = () => {
  open.value = false;
};

const statusOptions = [
  { label: 'Setup', value: 'setup' },
  { label: 'In corso', value: 'in_progress' },
  { label: 'Chiuso', value: 'closed' },
];
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6">
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-[hsl(var(--background)/0.8)] backdrop-blur-sm transition-colors"
        @click="handleClose"
      />

      <!-- Modal Card -->
      <div
        class="relative z-[105] w-full max-w-xl rounded-xl shadow-2xl border overflow-hidden bg-[hsl(var(--card))] border-[hsl(var(--border))]"
      >
        <!-- Header -->
        <div class="px-6 py-4 border-b flex items-center justify-between border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
          <div class="flex items-center gap-3">
            <div
              :class="[
                'w-10 h-10 rounded-lg flex items-center justify-center',
                props.mode === 'create'
                  ? 'bg-[hsl(var(--success)/0.2)] text-[hsl(var(--success))]'
                  : 'bg-[hsl(var(--warning)/0.2)] text-[hsl(var(--warning))]',
              ]"
            >
              <Icon
                :name="props.mode === 'create' ? 'heroicons:plus-circle' : 'heroicons:pencil-square'"
                class="w-5 h-5"
              />
            </div>
            <div>
              <h3 class="text-base font-semibold text-[hsl(var(--foreground))]">
                {{ title }}
              </h3>
              <p class="text-xs text-[hsl(var(--muted-foreground))]">
                {{ props.mode === 'create' ? 'Inserisci i dati del nuovo progetto' : 'Modifica le informazioni del progetto' }}
              </p>
            </div>
          </div>
          <UButton
            icon="i-heroicons-x-mark"
            variant="ghost"
            color="gray"
            size="sm"
            @click="handleClose"
          />
        </div>

        <!-- Body -->
        <div class="px-6 py-5 space-y-4 bg-[hsl(var(--card))] text-[hsl(var(--foreground))]">
          <!-- Row 1: Code & Name -->
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Codice" required>
              <UInput
                v-model="form.code"
                placeholder="es. PRJ-001"
                icon="i-heroicons-hashtag"
              />
            </UFormField>
            <UFormField label="Nome" required>
              <UInput
                v-model="form.name"
                placeholder="Nome del progetto"
                icon="i-heroicons-document-text"
              />
            </UFormField>
          </div>

          <!-- Description -->
          <UFormField label="Descrizione">
            <UTextarea
              v-model="form.description"
              placeholder="Descrizione opzionale del progetto..."
              :rows="3"
            />
          </UFormField>

          <!-- Row 2: Business Unit & Status -->
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Business Unit">
              <UInput
                v-model="form.business_unit"
                placeholder="es. Engineering"
                icon="i-heroicons-building-office"
              />
            </UFormField>
            <UFormField label="Stato">
              <USelect
                v-model="form.status"
                :options="statusOptions"
                value-key="value"
                option-attribute="label"
              />
            </UFormField>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t flex items-center justify-end gap-3 border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
          <UButton
            variant="ghost"
            color="gray"
            @click="handleClose"
          >
            Annulla
          </UButton>
          <UButton
            color="primary"
            :icon="props.mode === 'create' ? 'i-heroicons-plus' : 'i-heroicons-check'"
            @click="handleSubmit"
          >
            {{ submitLabel }}
          </UButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>
