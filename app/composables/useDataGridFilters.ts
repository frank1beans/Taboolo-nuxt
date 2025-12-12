import { ref, watch, type Ref } from 'vue';
import type { ActiveFilter, FilterPanelState, FilterPanelConfig, DataGridColumn } from '~/types/data-grid';

export function useDataGridFilters(
  gridApi: Ref<any>,
  columns: DataGridColumn[]
) {
  const quickFilterText = ref('');
  const activeFilters = ref<ActiveFilter[]>([]);
  const filterPanel = ref<FilterPanelState | null>(null);

  const applyQuickFilter = () => {
    if (!gridApi.value) return;
    gridApi.value.setGridOption('quickFilterText', quickFilterText.value);
  };

  const clearQuickFilter = () => {
    quickFilterText.value = '';
    applyQuickFilter();
  };

  const applyColumnFilter = (field: string, value: string | null, mode: 'equals' | 'blank' | 'notBlank') => {
    if (!gridApi.value) return;

    const model = gridApi.value.getFilterModel() || {};

    if (!value && mode === 'equals') {
      delete model[field];
    } else {
      model[field] =
        mode === 'blank'
          ? { filterType: 'text', type: 'equals', filter: '' }
          : mode === 'notBlank'
            ? { filterType: 'text', type: 'notBlank' }
            : { filterType: 'text', type: 'equals', filter: value };
    }

    gridApi.value.setFilterModel(model);
    gridApi.value.onFilterChanged();
    filterPanel.value = null;
  };

  const removeFilter = (field: string) => {
    if (!gridApi.value) return;
    const model = gridApi.value.getFilterModel();
    if (model[field]) {
      delete model[field];
      gridApi.value.setFilterModel(model);
      gridApi.value.onFilterChanged();
    }
  };

  const clearAllFilters = () => {
    if (!gridApi.value) return;
    gridApi.value.setFilterModel(null);
    gridApi.value.onFilterChanged();
  };

  const updateActiveFilters = () => {
    if (!gridApi.value) return;
    const model = gridApi.value.getFilterModel() || {};
    const filters: ActiveFilter[] = [];

    for (const key of Object.keys(model)) {
      const col = columns.find((c) => c.field === key);
      const label = col?.headerName || key;
      const m = model[key];

      if (m?.filter !== undefined) {
        filters.push({
          field: key,
          label,
          value: m.filter,
          type: m.type || 'equals'
        });
      }
    }

    activeFilters.value = filters;
  };

  const openFilterPanel = ({ field, label, options, rect }: FilterPanelConfig, containerRect?: DOMRect) => {
    if (!field) return;

    const viewportWidth = containerRect ? containerRect.width : window.innerWidth;
    const panelWidth = 260;
    const padding = 12;

    let left = containerRect
      ? rect.left - containerRect.left + padding
      : rect.left + window.scrollX;

    let anchor: 'left' | 'right' = 'left';

    if (containerRect && left + panelWidth + padding > containerRect.width) {
      left = rect.right - containerRect.left - panelWidth - padding;
      anchor = 'right';
    } else if (!containerRect && left + panelWidth + padding > viewportWidth) {
      left = rect.right + window.scrollX - panelWidth - padding;
      anchor = 'right';
    }

    const top = rect.bottom + window.scrollY + 6 - (containerRect?.top ?? 0);
    const height = Math.min(360, (containerRect?.height ?? window.innerHeight) - top - 24);

    filterPanel.value = { field, label, options, top, left, width: panelWidth, height, anchor };
  };

  // Watch gridApi and setup listener
  watch(gridApi, (api) => {
    if (api) {
      api.addEventListener('filterChanged', updateActiveFilters);
      updateActiveFilters();
    }
  });

  return {
    quickFilterText,
    activeFilters,
    filterPanel,
    applyQuickFilter,
    clearQuickFilter,
    applyColumnFilter,
    removeFilter,
    clearAllFilters,
    updateActiveFilters,
    openFilterPanel,
  };
}
