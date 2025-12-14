import { reactive, ref } from 'vue';
import type { Project } from './useProjects';

export type ProjectFormState = {
  id: string;
  name: string;
  code: string;
  description: string;
  business_unit: string;
  status: Project['status'];
};

const initialFormState = (): ProjectFormState => ({
  id: '',
  name: '',
  code: '',
  description: '',
  business_unit: '',
  status: 'setup',
});

export function useProjectForm() {
  const showModal = ref(false);
  const formMode = ref<'create' | 'edit'>('create');
  const form = reactive<ProjectFormState>(initialFormState());

  const resetForm = () => {
    Object.assign(form, initialFormState());
  };

  const openCreateModal = () => {
    formMode.value = 'create';
    resetForm();
    showModal.value = true;
  };

  const openEditModal = (project: Project) => {
    formMode.value = 'edit';
    Object.assign(form, {
      id: project.id,
      name: project.name,
      code: project.code,
      description: project.description || '',
      business_unit: project.business_unit || '',
      status: project.status,
    });
    showModal.value = true;
  };

  const closeModal = () => {
    showModal.value = false;
  };

  return {
    showModal,
    formMode,
    form,
    resetForm,
    openCreateModal,
    openEditModal,
    closeModal,
  };
}
