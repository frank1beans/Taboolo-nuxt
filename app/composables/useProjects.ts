import { ref } from 'vue';
import type { DataGridFetchParams, DataGridFetchResponse } from '~/types/data-grid';
import type { Project } from '#types';

export type ProjectPayload = {
  name: string;
  code: string;
  description?: string;
  business_unit?: string;
  status: Project['status'];
};

export function useProjects() {
  const projects = ref<Project[]>([]);
  const loading = ref(false);
  const error = ref<Error | null>(null);

  /**
   * Fetch projects with pagination, sorting, and filtering
   * Compatible with DataGrid fetchFn signature
   */
  const fetchProjects = async (params: DataGridFetchParams): Promise<DataGridFetchResponse<Project>> => {
    loading.value = true;
    error.value = null;

    try {
      // Build query params
      const queryParams: Record<string, string | number | undefined> = {
        page: params.page,
        pageSize: params.pageSize,
      };

      // Add quick search
      if (params.quickFilter) {
        queryParams.search = params.quickFilter;
      }

      // Add sorting
      if (params.sortModel && params.sortModel.length > 0) {
        const sortModel = params.sortModel[0] as { colId?: string; sort?: string };
        queryParams.sort = sortModel.colId;
        queryParams.order = sortModel.sort;
      }

      // Add column filters
      if (params.filterModel && Object.keys(params.filterModel).length > 0) {
        queryParams.filters = JSON.stringify(params.filterModel);
      }

      // Fetch from API
      const response = await $fetch<DataGridFetchResponse<Project>>('/api/projects', {
        query: queryParams,
      });

      projects.value = response.data;
      return response;
    } catch (err) {
      error.value = err as Error;
      console.error('Error fetching projects:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Fetch a single project by ID
   */
  const fetchProject = async (id: string): Promise<Project | null> => {
    loading.value = true;
    error.value = null;

    try {
      const project = await $fetch<Project>(`/api/projects/${id}`);
      return project;
    } catch (err) {
      error.value = err as Error;
      console.error('Error fetching project:', err);
      return null;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Get unique values for a field (for filter dropdowns)
   */
  const getFieldValues = (field: keyof Project): string[] => {
    const values = new Set<string>();
    projects.value.forEach((project) => {
      const value = project[field];
      if (value !== undefined && value !== null) {
        values.add(String(value));
      }
    });
    return Array.from(values).sort();
  };

  // --- CRUD Operations (Merged from useProjectCrud) ---

  const createProject = async (payload: ProjectPayload) => {
    return $fetch('/api/projects', {
      method: 'POST',
      body: payload,
    });
  };

  const updateProject = async (id: string, payload: ProjectPayload) => {
    return $fetch(`/api/projects/${id}`, {
      method: 'PUT',
      body: payload,
    });
  };

  const deleteProject = async (id: string) => {
    return $fetch(`/api/projects/${id}`, { method: 'DELETE' });
  };

  const reloadProjects = async (params: DataGridFetchParams = { page: 1, pageSize: 100 }) => {
    const response = await fetchProjects(params);
    return response.data;
  };

  return {
    projects,
    loading,
    error,
    fetchProjects,
    fetchProject,
    getFieldValues,
    // CRUD
    createProject,
    updateProject,
    deleteProject,
    reloadProjects
  };
}
