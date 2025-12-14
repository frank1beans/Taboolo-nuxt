import { ref, watch, type Ref } from 'vue';
import type {
  ActiveFilter,
  ColumnFilter,
  ColumnFilterOperator,
  FilterPanelState,
  FilterPanelConfig,
  DataGridColumn
} from '~/types/data-grid';

export function useDataGridFilters(
  gridApi: Ref<any>,
  columns: DataGridColumn[]
) {
  const quickFilterText = ref('');
  const activeFilters = ref<ActiveFilter[]>([]);
  const filterPanel = ref<FilterPanelState | null>(null);

  const operatorRequiresValue = (operator: ColumnFilterOperator) =>
    ['contains', 'starts_with', 'equals', 'not_contains'].includes(operator);

  const toAgFilterModel = (filter: ColumnFilter | null) => {
    if (!filter) return null;
    const trimmed = (filter.value ?? '').toString().trim();
    const hasValue = trimmed.length > 0;

    if (operatorRequiresValue(filter.operator) && !hasValue) {
      return null;
    }

    // Numeric filters
    if (['greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal', 'in_range'].includes(filter.operator)) {
      const filterType = 'number';
      const value = Number(trimmed);
      if (isNaN(value)) return null;

      switch (filter.operator) {
        case 'greater_than':
          return { filterType, type: 'greaterThan', filter: value };
        case 'less_than':
          return { filterType, type: 'lessThan', filter: value };
        case 'greater_than_or_equal':
          return { filterType, type: 'greaterThanOrEqual', filter: value };
        case 'less_than_or_equal':
          return { filterType, type: 'lessThanOrEqual', filter: value };
        case 'equals':
          return { filterType, type: 'equals', filter: value };
        case 'not_equals':
          return { filterType, type: 'notEqual', filter: value };
        default:
          return null;
      }
    }

    // Text filters
    switch (filter.operator) {
      case 'contains':
        return { filterType: 'text', type: 'contains', filter: trimmed };
      case 'starts_with':
        return { filterType: 'text', type: 'startsWith', filter: trimmed };
      case 'equals':
        return { filterType: 'text', type: 'equals', filter: trimmed };
      case 'not_contains':
        return { filterType: 'text', type: 'notContains', filter: trimmed };
      case 'is_empty':
        return { filterType: 'text', type: 'blank' };
      case 'is_not_empty':
        return { filterType: 'text', type: 'notBlank' };
      default:
        return null;
    }
  };

  const fromAgFilterModel = (model: any): ColumnFilter | null => {
    if (!model) return null;
    const type = model.type as string | undefined;
    const value = model.filter;

    if ((type === 'equals' || !type) && (value === '' || value === null || value === undefined)) {
      return { columnKey: '', operator: 'is_empty', value: '' };
    }

    // Numeric types
    if (model.filterType === 'number') {
      switch (type) {
        case 'greaterThan':
          return { columnKey: '', operator: 'greater_than', value: String(value) };
        case 'lessThan':
          return { columnKey: '', operator: 'less_than', value: String(value) };
        case 'greaterThanOrEqual':
          return { columnKey: '', operator: 'greater_than_or_equal', value: String(value) };
        case 'lessThanOrEqual':
          return { columnKey: '', operator: 'less_than_or_equal', value: String(value) };
        case 'equals':
          return { columnKey: '', operator: 'equals', value: String(value) };
        case 'notEqual':
          return { columnKey: '', operator: 'not_equals', value: String(value) };
      }
    }

    // Text types
    switch (type) {
      case 'contains':
        return { columnKey: '', operator: 'contains', value: String(value) };
      case 'startsWith':
        return { columnKey: '', operator: 'starts_with', value: String(value) };
      case 'equals':
        return { columnKey: '', operator: 'equals', value: String(value) };
      case 'notContains':
        return { columnKey: '', operator: 'not_contains', value: String(value) };
      case 'blank':
        return { columnKey: '', operator: 'is_empty', value: '' };
      case 'notBlank':
        return { columnKey: '', operator: 'is_not_empty', value: '' };
      default:
        return null;
    }
  };

  const applyQuickFilter = () => {
    if (!gridApi.value) return;
    gridApi.value.setGridOption('quickFilterText', quickFilterText.value);
  };

  const clearQuickFilter = () => {
    quickFilterText.value = '';
    applyQuickFilter();
  };

  const applyColumnFilter = (field: string, filter: ColumnFilter | null) => {
    if (!gridApi.value) return;

    const model = gridApi.value.getFilterModel() || {};

    if (!filter) {
      delete model[field];
    } else {
      const mapped = toAgFilterModel(filter);
      if (mapped) {
        model[field] = mapped;
      } else {
        delete model[field];
      }
    }

    gridApi.value.setFilterModel(model);
    gridApi.value.onFilterChanged();
    updateActiveFilters();
    filterPanel.value = null;
  };

  const removeFilter = (field: string) => {
    if (!gridApi.value) return;
    const model = gridApi.value.getFilterModel();
    if (model[field]) {
      delete model[field];
      gridApi.value.setFilterModel(model);
      gridApi.value.onFilterChanged();
      updateActiveFilters();
    }
  };

  const clearAllFilters = () => {
    if (!gridApi.value) return;
    gridApi.value.setFilterModel(null);
    gridApi.value.onFilterChanged();
    updateActiveFilters();
  };

  const updateActiveFilters = () => {
    if (!gridApi.value) return;
    const model = gridApi.value.getFilterModel() || {};
    const filters: ActiveFilter[] = [];

    for (const key of Object.keys(model)) {
      const col = columns.find((c) => c.field === key);
      const label = col?.headerName || key;
      const m = model[key];

      const parsed = fromAgFilterModel(m);
      if (parsed) {
        const valueForChip = (() => {
          switch (parsed.operator) {
            case 'is_empty':
              return 'Vuoto';
            case 'is_not_empty':
              return 'Non vuoto';
            default:
              return (parsed.value ?? '').toString();
          }
        })();

        filters.push({
          field: key,
          label,
          value: valueForChip,
          operator: parsed.operator,
        });
      }
    }

    activeFilters.value = filters;
  };

  const getCurrentFilter = (field: string): ColumnFilter | null => {
    if (!gridApi.value) return null;
    const model = gridApi.value.getFilterModel?.() || {};
    const parsed = fromAgFilterModel(model[field]);
    return parsed ? { columnKey: field, ...parsed } : null;
  };

  const openFilterPanel = ({ field, label, options, triggerEl, filterType }: FilterPanelConfig) => {
    if (!field) return;
    const rect = triggerEl?.getBoundingClientRect?.();
    filterPanel.value = {
      field,
      label,
      options,
      triggerRect: rect,
      triggerEl: triggerEl ?? null,
      currentFilter: getCurrentFilter(field),
      filterType,
    };
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
    getCurrentFilter,
  };
}
