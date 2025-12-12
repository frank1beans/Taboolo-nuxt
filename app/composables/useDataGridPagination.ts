import { ref } from 'vue';
import type { DataGridFetchParams, DataGridFetchResponse, PaginationConfig } from '~/types/data-grid';

export function useDataGridPagination(
  fetchFn: (params: DataGridFetchParams) => Promise<DataGridFetchResponse>,
  config: PaginationConfig
) {
  const data = ref<any[]>([]);
  const loading = ref(false);
  const total = ref(0);
  const currentPage = ref(1);
  const pageSize = ref(config.pageSize);

  const fetchData = async (params: DataGridFetchParams) => {
    loading.value = true;
    try {
      const response = await fetchFn(params);
      data.value = response.data;
      total.value = response.total;
      currentPage.value = response.page;
      pageSize.value = response.pageSize;
      return response;
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const goToPage = (page: number) => {
    currentPage.value = page;
    return fetchData({
      page,
      pageSize: pageSize.value,
    });
  };

  const nextPage = () => {
    const totalPages = Math.ceil(total.value / pageSize.value);
    if (currentPage.value < totalPages) {
      return goToPage(currentPage.value + 1);
    }
  };

  const previousPage = () => {
    if (currentPage.value > 1) {
      return goToPage(currentPage.value - 1);
    }
  };

  const changePageSize = (newSize: number) => {
    pageSize.value = newSize;
    return goToPage(1);
  };

  return {
    data,
    loading,
    total,
    currentPage,
    pageSize,
    fetchData,
    goToPage,
    nextPage,
    previousPage,
    changePageSize,
  };
}
