import { ref, type Ref } from 'vue';
import type { WbsNode, WbsFilterConfig } from '~/types/wbs';

export function useWbsFilters(
  gridApi: Ref<any>,
  filterConfigs: WbsFilterConfig[] = []
) {
  const selectedWbsNode = ref<WbsNode | null>(null);
  const wbsFilterFields = ref<string[]>([]);

  // Track which fields are WBS-managed
  const initializeWbsFields = () => {
    wbsFilterFields.value = filterConfigs.map((config) => config.field);
  };

  // Apply filters based on WBS node selection
  const applyWbsFilters = (node: WbsNode | null) => {
    if (!gridApi.value || !node) return;

    const filterModel = gridApi.value.getFilterModel() || {};

    // Clear previous WBS filters
    wbsFilterFields.value.forEach((field) => {
      if (filterModel[field]) {
        delete filterModel[field];
      }
    });

    // Apply new WBS filters
    filterConfigs.forEach((config) => {
      // Only apply filter if node level matches or exceeds config level
      if (node.level >= config.wbsLevel) {
        try {
          const value = config.extractValue(node);
          if (value) {
            filterModel[config.field] = {
              filterType: 'text',
              type: 'equals',
              filter: value,
            };
          }
        } catch (error) {
          console.warn(`Error extracting value for WBS filter on field ${config.field}:`, error);
        }
      }
    });

    gridApi.value.setFilterModel(filterModel);
    gridApi.value.onFilterChanged();
    selectedWbsNode.value = node;
  };

  // Clear only WBS filters, keep other filters
  const clearWbsFilters = () => {
    if (!gridApi.value) return;

    const filterModel = gridApi.value.getFilterModel() || {};

    // Remove only WBS-managed filters
    wbsFilterFields.value.forEach((field) => {
      if (filterModel[field]) {
        delete filterModel[field];
      }
    });

    gridApi.value.setFilterModel(filterModel);
    gridApi.value.onFilterChanged();
    selectedWbsNode.value = null;
  };

  // Check if a field is managed by WBS filters
  const isWbsField = (field: string): boolean => {
    return wbsFilterFields.value.includes(field);
  };

  // Initialize on creation
  if (filterConfigs.length > 0) {
    initializeWbsFields();
  }

  return {
    selectedWbsNode,
    wbsFilterFields,
    applyWbsFilters,
    clearWbsFilters,
    isWbsField,
  };
}
