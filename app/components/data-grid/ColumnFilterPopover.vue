<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import type { ColumnFilter, ColumnFilterOperator, FilterPanelState } from '~/types/data-grid';
import { matchesOperator } from '~/utils/columnFilter';

const props = defineProps<{
  panel: FilterPanelState | null;
}>();

const emit = defineEmits<{
  'apply-filter': [field: string, filter: ColumnFilter | null];
  close: [];
}>();

const popoverRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);
const operatorRef = ref<HTMLSelectElement | null>(null);

const isOpen = computed(() => !!props.panel);

const operator = ref<ColumnFilterOperator>('contains');
const query = ref('');
const selectedValues = ref<Set<string>>(new Set());

const initialOperator = ref<ColumnFilterOperator>('contains');
const initialValue = ref('');
const initialSelected = ref<Set<string>>(new Set());

const placement = ref<'left' | 'right'>('right');
const widthPx = ref(360);
const pos = ref({ top: 0, left: 0 });

const isNumeric = computed(() => props.panel?.filterType === 'number');
const multiSelect = computed(() => props.panel?.multiSelect === true);

const operatorOptions: Array<{ label: string; value: ColumnFilterOperator }> = [
  { label: 'Contiene', value: 'contains' },
  { label: 'Inizia con', value: 'starts_with' },
  { label: 'Uguale a', value: 'equals' },
  { label: 'Non contiene', value: 'not_contains' },
  { label: 'Vuoto', value: 'is_empty' },
  { label: 'Non vuoto', value: 'is_not_empty' },
];

const numericOperatorOptions: Array<{ label: string; value: ColumnFilterOperator }> = [
  { label: 'Uguale a', value: 'equals' },
  { label: 'Diverso da', value: 'not_equals' },
  { label: 'Maggiore di', value: 'greater_than' },
  { label: 'Minore di', value: 'less_than' },
  { label: 'Maggiore o uguale', value: 'greater_than_or_equal' },
  { label: 'Minore o uguale', value: 'less_than_or_equal' },
];

const currentOperatorOptions = computed(() =>
  isNumeric.value ? numericOperatorOptions : operatorOptions
);

const operatorRequiresValue = (op: ColumnFilterOperator) =>
  op === 'contains' ||
  op === 'starts_with' ||
  op === 'equals' ||
  op === 'not_contains' ||
  op === 'greater_than' ||
  op === 'less_than' ||
  op === 'greater_than_or_equal' ||
  op === 'less_than_or_equal' ||
  op === 'not_equals' ||
  op === 'in';

const inputDisabled = computed(() => multiSelect.value ? false : !operatorRequiresValue(operator.value));
const normalizedQuery = computed(() => {
  const val = query.value as unknown;
  return (val === null || val === undefined ? '' : String(val)).trim();
});

const placeholder = computed(() => {
  if (multiSelect.value) return 'Cerca valori...';
  const label = props.panel?.label ?? 'colonna';
  if (operator.value === 'is_empty') return 'Valori vuoti';
  if (operator.value === 'is_not_empty') return 'Valori non vuoti';
  return `Filtra i valori di ${label}`;
});

const totalOptions = computed(() => props.panel?.options?.length ?? 0);
const visibleOptions = computed(() => {
  const options = props.panel?.options ?? [];
  const searchOperator = multiSelect.value ? 'contains' : operator.value;
  
  // If no query, show all options regardless of operator
  if (!normalizedQuery.value) {
    return options;
  }
  
  // For is_empty and is_not_empty operators, don't filter options by query
  if (!multiSelect.value && (operator.value === 'is_empty' || operator.value === 'is_not_empty')) {
    return options;
  }
  
  // For text-based operators, filter options that match the current query
  // For numeric operators with a query, show options that would match the comparison
  return options.filter((opt) => matchesOperator(String(opt ?? ''), normalizedQuery.value, searchOperator));
});
const visibleCount = computed(() => visibleOptions.value.length);
const highlightEnabled = computed(
  () => multiSelect.value || operator.value === 'contains' || operator.value === 'starts_with' || operator.value === 'equals'
);

const getHighlightParts = (value: string) => {
  if (!highlightEnabled.value) return { match: false, parts: [value] as [string] };

  const q = normalizedQuery.value.toLowerCase();
  if (!q) return { match: false, parts: [value] as [string] };

  const lower = value.toLowerCase();
  const idx = operator.value === 'starts_with' && !multiSelect.value
    ? (lower.startsWith(q) ? 0 : -1)
    : lower.indexOf(q);
  if (idx === -1) return { match: false, parts: [value] as [string] };

  const end = idx + q.length;
  const before = value.slice(0, idx);
  const match = value.slice(idx, end);
  const after = value.slice(end);

  return { match: true, parts: [before, match, after] as [string, string, string] };
};

const setInitialState = (panel: FilterPanelState) => {
  const current = panel.currentFilter;

  if (panel.multiSelect) {
    const rawValues = Array.isArray(current?.value)
      ? current?.value
      : current?.value
        ? [String(current.value)]
        : [];

    const nextSelected = new Set(rawValues.map((v) => String(v)));
    selectedValues.value = nextSelected;
    initialSelected.value = new Set(nextSelected);

    operator.value = 'in';
    query.value = '';
    initialOperator.value = operator.value;
    initialValue.value = '';
    return;
  }
  
  // Determine default operator based on filter type
  // For numeric filters, 'contains' is not valid, so default to 'equals'
  const isNumericFilter = panel.filterType === 'number';
  const defaultOperator: ColumnFilterOperator = isNumericFilter ? 'equals' : 'contains';
  
  // If there's a current filter, use its operator; otherwise use the appropriate default
  let initialOp = current?.operator ?? defaultOperator;
  
  // Validate that the operator is compatible with the filter type
  // If a text-only operator is set on a numeric column, reset to default
  const textOnlyOperators: ColumnFilterOperator[] = ['contains', 'starts_with', 'not_contains'];
  if (isNumericFilter && textOnlyOperators.includes(initialOp)) {
    initialOp = defaultOperator;
  }
  
  operator.value = initialOp;
  query.value = (current?.value ?? '').toString();

  initialOperator.value = operator.value;
  initialValue.value = normalizedQuery.value;
};

const isDirty = computed(() => {
  if (multiSelect.value) {
    if (selectedValues.value.size !== initialSelected.value.size) return true;
    for (const v of selectedValues.value) {
      if (!initialSelected.value.has(v)) return true;
    }
    return false;
  }
  return operator.value !== initialOperator.value || normalizedQuery.value !== initialValue.value;
});

const applyButtonDisabled = computed(() => {
  if (multiSelect.value) return !isDirty.value;
  const needsValue = operatorRequiresValue(operator.value) && !normalizedQuery.value;
  return needsValue || !isDirty.value;
});

const focusInitial = () => {
  if (!import.meta.client) return;
  nextTick(() => {
    if (!inputDisabled.value) inputRef.value?.focus();
    else operatorRef.value?.focus();
  });
};

const applyFilter = (force = false) => {
  if (!props.panel) return;

  if (multiSelect.value) {
    if (!force && !isDirty.value) return;
    const values = Array.from(selectedValues.value);
    if (!values.length) {
      emit('apply-filter', props.panel.field, null);
      emit('close');
      return;
    }
    const filter: ColumnFilter = {
      columnKey: props.panel.field,
      operator: 'in',
      value: values,
    };
    emit('apply-filter', props.panel.field, filter);
    emit('close');
    return;
  }

  if (!force) {
    if (!isDirty.value) return;
    if (operatorRequiresValue(operator.value) && !normalizedQuery.value) {
      focusInitial();
      return;
    }
  }

  if (operatorRequiresValue(operator.value) && !normalizedQuery.value) {
    focusInitial();
    return;
  }

  const filter: ColumnFilter = {
    columnKey: props.panel.field,
    operator: operator.value,
    value: normalizedQuery.value,
  };

  emit('apply-filter', props.panel.field, filter);
  emit('close');
};

const resetFilter = () => {
  if (!props.panel) return;
  emit('apply-filter', props.panel.field, null);
  emit('close');
};

const applyEmptyShortcut = (op: ColumnFilterOperator) => {
  operator.value = op;
  query.value = '';
  applyFilter(true);
};

const applyEqualsValue = (value: string) => {
  if (multiSelect.value) {
    toggleSelection(value);
    return;
  }
  operator.value = 'equals';
  query.value = value;
  applyFilter(true);
};

const handleOperatorChange = (value: ColumnFilterOperator) => {
  if (multiSelect.value) return;
  operator.value = value;
  if (!operatorRequiresValue(value)) query.value = '';
  focusInitial();
};

const toggleSelection = (value: string) => {
  const next = new Set(selectedValues.value);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  selectedValues.value = next;
};

const selectAllVisible = () => {
  const next = new Set(selectedValues.value);
  visibleOptions.value.forEach((opt) => next.add(String(opt)));
  selectedValues.value = next;
};

const clearSelection = () => {
  selectedValues.value = new Set();
};

const updatePosition = () => {
  if (!import.meta.client || !props.panel || !popoverRef.value) return;

  const trigger = props.panel.triggerEl;
  const rect = trigger?.getBoundingClientRect?.() ?? props.panel.triggerRect;
  if (!rect) return;

  const margin = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const popW = widthPx.value;
  const popH = Math.max(260, Math.min(popoverRef.value.offsetHeight || 320, Math.floor(vh * 0.8)));

  let left = rect.right + margin;
  let side: 'left' | 'right' = 'right';

  if (left + popW > vw - margin) {
    const leftCandidate = rect.left - popW - margin;
    if (leftCandidate >= margin) {
      left = leftCandidate;
      side = 'left';
    } else {
      left = Math.min(
        Math.max(rect.left + rect.width / 2 - popW / 2, margin),
        Math.max(margin, vw - popW - margin)
      );
      side = left < rect.left ? 'left' : 'right';
    }
  }

  let top = rect.top;
  top = Math.min(Math.max(top, margin), Math.max(margin, vh - popH - margin));

  placement.value = side;
  pos.value = { top, left };
};

const stylePosition = computed(() => ({
  top: `${pos.value.top}px`,
  left: `${pos.value.left}px`,
  width: `${widthPx.value}px`,
}));

const onOutsideClick = (event: MouseEvent) => {
  if (!isOpen.value || !popoverRef.value) return;
  const target = event.target as Node;

  if (popoverRef.value.contains(target)) return;
  const trigger = props.panel?.triggerEl;
  if (trigger && trigger.contains(target)) return;

  emit('close');
};

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') emit('close');
  if (event.key === 'Enter' && !inputDisabled.value) {
    if (!applyButtonDisabled.value) applyFilter();
  }
};

const onScroll = () => {
  window.requestAnimationFrame(updatePosition);
};

const setupListeners = () => {
  if (!import.meta.client) return;
  window.addEventListener('resize', updatePosition);
  window.addEventListener('scroll', onScroll, true);
  window.addEventListener('mousedown', onOutsideClick, true);
  window.addEventListener('keydown', onKeydown, true);
};

const teardownListeners = () => {
  if (!import.meta.client) return;
  window.removeEventListener('resize', updatePosition);
  window.removeEventListener('scroll', onScroll, true);
  window.removeEventListener('mousedown', onOutsideClick, true);
  window.removeEventListener('keydown', onKeydown, true);
};

const resizing = ref(false);
const startX = ref(0);
const startWidth = ref(0);
const startLeft = ref(0);

const onResizeStart = (e: MouseEvent) => {
  if (!import.meta.client) return;
  resizing.value = true;
  startX.value = e.clientX;
  startWidth.value = widthPx.value;
  startLeft.value = pos.value.left;

  document.addEventListener('mousemove', onResizeMove);
  document.addEventListener('mouseup', onResizeEnd);
};

const onResizeMove = (e: MouseEvent) => {
  if (!resizing.value) return;

  const margin = 12;
  const vw = window.innerWidth;
  const minW = 320;
  const maxW = Math.floor(vw * 0.92);

  if (placement.value === 'right') {
    const delta = e.clientX - startX.value;
    const newW = Math.max(minW, Math.min(maxW, startWidth.value + delta));
    widthPx.value = newW;
    pos.value.left = Math.min(Math.max(startLeft.value, margin), vw - newW - margin);
  } else {
    const delta = startX.value - e.clientX;
    const newW = Math.max(minW, Math.min(maxW, startWidth.value + delta));
    const rightEdge = startLeft.value + startWidth.value;
    const newLeft = Math.max(margin, Math.min(vw - newW - margin, rightEdge - newW));

    widthPx.value = newW;
    pos.value.left = newLeft;
  }
};

const onResizeEnd = () => {
  resizing.value = false;
  document.removeEventListener('mousemove', onResizeMove);
  document.removeEventListener('mouseup', onResizeEnd);
};

watch(
  () => props.panel,
  (panel) => {
    if (!panel) {
      teardownListeners();
      return;
    }

    setInitialState(panel);

    nextTick(() => {
      updatePosition();
      focusInitial();
      setupListeners();
    });
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  teardownListeners();
  onResizeEnd();
});
</script>

<template>
  <Teleport to="body">
    <transition name="fade">
      <div
        v-if="isOpen && panel"
        ref="popoverRef"
        class="fixed z-[100] max-w-[92vw] rounded-xl border shadow-2xl overflow-hidden bg-[hsl(var(--card))] border-[hsl(var(--border))] text-[hsl(var(--foreground))]"
        :style="stylePosition"
      >
        <!-- Header -->
        <div class="px-4 py-3 flex items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
          <p class="text-[11px] uppercase tracking-wider font-semibold text-[hsl(var(--muted-foreground))]">
            Filtra: {{ panel.label }}
          </p>

          <button
            type="button"
            class="p-1.5 rounded-lg transition hover:bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
            aria-label="Chiudi"
            @click="emit('close')"
          >
            <Icon name="heroicons:x-mark" class="w-4 h-4" />
          </button>
        </div>

        <!-- Body -->
        <div class="px-4 py-3 space-y-3">
          <div class="grid grid-cols-12 gap-2 items-end">
            <div v-if="!multiSelect" class="col-span-4">
              <label class="block text-[11px] font-semibold uppercase tracking-wide mb-1 text-[hsl(var(--muted-foreground))]">
                Operatore
              </label>

              <select
                ref="operatorRef"
                v-model="operator"
                class="w-full text-sm rounded-lg border px-3 py-2 focus:outline-none bg-[hsl(var(--card))] border-[hsl(var(--border))] text-[hsl(var(--foreground))] focus:border-[hsl(var(--ring))]"
                @change="handleOperatorChange(($event.target as HTMLSelectElement).value as ColumnFilterOperator)"
              >
                <option v-for="opt in currentOperatorOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <div :class="multiSelect ? 'col-span-12' : 'col-span-8'">
              <label class="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide mb-1 text-[hsl(var(--muted-foreground))]">
                <span>{{ multiSelect ? 'Seleziona valori' : 'Valore' }}</span>
                <span class="text-[10px] text-[hsl(var(--muted-foreground))]">
                  Valori mostrati: {{ visibleCount }} / {{ totalOptions }}
                  <span v-if="multiSelect && selectedValues.size" class="ml-2 text-[hsl(var(--primary))]">
                    Selezionati: {{ selectedValues.size }}
                  </span>
                </span>
              </label>

              <div class="relative">
                <Icon
                  name="heroicons:magnifying-glass"
                  class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]"
                />
                <input
                  ref="inputRef"
                  v-model="query"
                  :type="isNumeric ? 'number' : 'text'"
                  :disabled="inputDisabled"
                  :placeholder="placeholder"
                  class="w-full py-2 rounded-lg text-sm transition-colors border bg-[hsl(var(--card))] border-[hsl(var(--border))] text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--ring))] focus:ring-1 focus:ring-[hsl(var(--ring)/0.6)]"
                  :class="[
                    inputDisabled ? 'opacity-60 cursor-not-allowed' : '',
                    'pl-9 pr-3'
                  ]"
                >
              </div>
            </div>
          </div>

          <div v-if="!multiSelect" class="flex flex-wrap gap-2">
            <button
              type="button"
              class="text-xs px-2.5 py-1 rounded-lg border transition border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
              @click="resetFilter"
            >
              Mostra tutto
            </button>
            <button
              type="button"
              class="text-xs px-2.5 py-1 rounded-lg border transition border-[hsl(var(--warning)/0.5)] text-[hsl(var(--warning))] hover:bg-[hsl(var(--warning)/0.12)]"
              @click="applyEmptyShortcut('is_empty')"
            >
              Solo vuoti
            </button>
            <button
              type="button"
              class="text-xs px-2.5 py-1 rounded-lg border transition border-[hsl(var(--success)/0.5)] text-[hsl(var(--success))] hover:bg-[hsl(var(--success)/0.14)]"
              @click="applyEmptyShortcut('is_not_empty')"
            >
              Solo non vuoti
            </button>
          </div>

          <div v-else class="flex flex-wrap gap-2">
            <button
              type="button"
              class="text-xs px-2.5 py-1 rounded-lg border transition border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
              @click="selectAllVisible"
            >
              Seleziona tutti
            </button>
            <button
              type="button"
              class="text-xs px-2.5 py-1 rounded-lg border transition border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
              @click="clearSelection"
            >
              Deseleziona
            </button>
            <button
              type="button"
              class="text-xs px-2.5 py-1 rounded-lg border transition border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
              @click="resetFilter"
            >
              Mostra tutto
            </button>
          </div>
        </div>

        <!-- Values list -->
        <div class="border-t border-[hsl(var(--border))]">
          <div class="px-4 py-2 text-[10px] uppercase tracking-wider font-semibold text-[hsl(var(--muted-foreground))] bg-[hsl(var(--secondary))]">
            Valori disponibili ({{ visibleCount }})
          </div>

          <div class="max-h-64 overflow-y-auto">
            <button
              v-for="opt in visibleOptions"
              :key="String(opt)"
              type="button"
              class="w-full text-left px-4 py-2.5 flex items-center gap-3 text-sm border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]"
              @click="applyEqualsValue(String(opt))"
            >
              <template v-if="multiSelect">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] focus:ring-[hsl(var(--ring)/0.6)]"
                  :checked="selectedValues.has(String(opt))"
                  @click.stop="toggleSelection(String(opt))"
                >
              </template>
              <Icon
                v-else
                name="heroicons:tag"
                class="w-4 h-4 text-[hsl(var(--muted-foreground))]"
              />
              <span class="flex-1 truncate">
                <template v-if="getHighlightParts(String(opt)).match">
                  <template v-for="(part, idx) in getHighlightParts(String(opt)).parts" :key="idx">
                    <mark
                      v-if="idx === 1"
                      class="bg-[hsl(var(--warning)/0.2)] text-[hsl(var(--warning))] px-0.5 rounded"
                    >
                      {{ part }}
                    </mark>
                    <template v-else>
                      {{ part }}
                    </template>
                  </template>
                </template>
                <template v-else>
                  {{ String(opt) }}
                </template>
              </span>
              <Icon v-if="!multiSelect" name="heroicons:chevron-right" class="w-4 h-4 opacity-40" />
            </button>

            <div
              v-if="!visibleOptions.length"
              class="px-4 py-6 text-center text-sm text-[hsl(var(--muted-foreground))]"
            >
              Nessun valore trovato.
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div 
          class="px-4 py-3 flex items-center justify-between border-t border-[hsl(var(--border))] bg-[hsl(var(--secondary))]"
          :class="placement === 'right' ? 'pr-12' : 'pl-12'"
        >
          <button
            type="button"
            class="text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            @click="resetFilter"
          >
            Reset
          </button>

          <button
            type="button"
            class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition disabled:opacity-50 bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.6)]"
            :disabled="applyButtonDisabled"
            @click="applyFilter()"
          >
            <Icon name="heroicons:funnel" class="w-4 h-4" />
            Applica
          </button>
        </div>

        <div
          class="absolute bottom-0 flex items-center justify-center w-10 h-[57px] cursor-ew-resize text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--muted))] transition-colors"
          :class="placement === 'right' ? 'right-0 border-l border-[hsl(var(--border))]' : 'left-0 border-r border-[hsl(var(--border))]'"
          title="Trascina per ridimensionare"
          @mousedown.prevent="onResizeStart"
        >
          <Icon name="heroicons:bars-2" class="w-5 h-5 rotate-90" />
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 120ms ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
