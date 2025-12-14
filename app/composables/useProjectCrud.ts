import type { DataGridFetchParams, DataGridFetchResponse } from '~/types/data-grid';
import { useProjects } from './useProjects';
import type { Project } from './useProjects';

type ProjectPayload = {
  name: string;
  code: string;
  description?: string;
  business_unit?: string;
  status: Project['status'];
};

type FetchProjectsFn = (params: DataGridFetchParams) => Promise<DataGridFetchResponse<Project>>;

const defaultReloadParams: DataGridFetchParams = { page: 1, pageSize: 100 };

export function useProjectCrud(fetchProjects?: FetchProjectsFn) {
  const fetchFn = fetchProjects ?? useProjects().fetchProjects;

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

  const reloadProjects = async (params: DataGridFetchParams = defaultReloadParams) => {
    const response = await fetchFn(params);
    return response.data;
  };

  return {
    createProject,
    updateProject,
    deleteProject,
    reloadProjects,
  };
}
