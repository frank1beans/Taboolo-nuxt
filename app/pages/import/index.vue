<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import MainPage from '~/components/layout/MainPage.vue';
import PageHeader from '~/components/layout/PageHeader.vue';
import ProjectFormModal from '~/components/projects/ProjectFormModal.vue';
import { useProjects } from '~/composables/useProjects';
import { useProjectForm } from '~/composables/useProjectForm';
import { useCurrentContext } from '~/composables/useCurrentContext';

definePageMeta({
  title: 'Importazione Dati',
  disableDefaultSidebar: true,
});

type ProjectListRow = {
  id: string;
  name: string;
  code: string;
  status?: string;
  updated_at?: string;
};

const { data: projectsData, status: projectsStatus, refresh: refreshProjects } = await useAsyncData(
  'import-projects',
  () =>
    $fetch<{ data: ProjectListRow[]; total: number }>('/api/projects', {
      query: { page: 1, pageSize: 200, sort: 'updated_at', order: 'desc' },
    }),
);

const projects = computed(() => projectsData.value?.data || []);
const loading = computed(() => projectsStatus.value === 'pending');

const projectOptions = computed(() =>
  projects.value.map((project) => ({
    label: `${project.code} - ${project.name}`,
    value: String(project.id),
  })),
);

const selectedProjectId = ref<string | null>(null);
const { currentProjectId, setCurrentProject } = useCurrentContext();
const router = useRouter();

watch(
  () => currentProjectId.value,
  (value) => {
    if (value && !selectedProjectId.value) {
      selectedProjectId.value = String(value);
    }
  },
  { immediate: true },
);

const { createProject } = useProjects();
const { showModal, formMode, form, openCreateModal, closeModal } = useProjectForm();
const isSubmitting = ref(false);

const submitForm = async () => {
  if (isSubmitting.value) return;
  try {
    isSubmitting.value = true;
    const payload = {
      name: form.name,
      code: form.code,
      description: form.description,
      business_unit: form.business_unit,
      status: form.status,
    };
    const created = (await createProject(payload)) as { id?: string };
    closeModal();
    await refreshProjects();
    if (created?.id) {
      selectedProjectId.value = String(created.id);
    }
  } catch (error) {
    console.error('Errore nel salvataggio progetto:', error);
  } finally {
    isSubmitting.value = false;
  }
};

const canContinue = computed(() => Boolean(selectedProjectId.value));

const goToImport = async () => {
  if (!selectedProjectId.value) return;
  await setCurrentProject(selectedProjectId.value);
  router.push(`/projects/${selectedProjectId.value}/import`);
};
</script>

<template>
  <div class="h-full">
    <MainPage :loading="loading">
    <template #header>
      <PageHeader title="Importazione Dati" :divider="false" />
    </template>

    <template #default>
      <div class="flex-1 min-h-0 flex flex-col">
        <div class="max-w-3xl mx-auto w-full space-y-6 pt-4">
          <div class="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm">
            <h2 class="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">Seleziona il progetto</h2>
            <p class="text-sm text-[hsl(var(--muted-foreground))] mb-4">
              Scegli un progetto esistente o creane uno nuovo per procedere con l'import.
            </p>

            <div class="space-y-4">
              <UFormField label="Progetto">
                <USelectMenu
                  v-model="selectedProjectId"
                  :items="projectOptions"
                  value-key="value"
                  placeholder="Seleziona un progetto"
                />
              </UFormField>

              <div class="flex items-center justify-between gap-3">
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-heroicons-plus"
                  @click="openCreateModal"
                >
                  Crea nuovo progetto
                </UButton>
                <UButton
                  color="primary"
                  icon="i-heroicons-arrow-right"
                  :disabled="!canContinue"
                  @click="goToImport"
                >
                  Continua all'import
                </UButton>
              </div>
            </div>
          </div>

          <div class="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)] p-5 text-sm text-[hsl(var(--muted-foreground))]">
            <div class="font-medium text-[hsl(var(--foreground))] mb-1">Tipi di file supportati</div>
            <div>SIX/XML, XPWE, Excel (.xls, .xlsx)</div>
          </div>
        </div>
      </div>
    </template>
    </MainPage>

    <ClientOnly>
      <ProjectFormModal
        v-model:open="showModal"
        v-model:form="form"
        :mode="formMode"
        @submit="submitForm"
      />
    </ClientOnly>
  </div>
</template>
