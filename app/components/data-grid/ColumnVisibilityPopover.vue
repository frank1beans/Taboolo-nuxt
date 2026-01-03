<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

interface ColumnState {
  colId: string;
  headerName: string;
  visible: boolean;
}

type ColumnGroup = ColumnState & { ids: string[] };

const props = defineProps<{
  open: boolean;
  trigger: HTMLElement | null;
  columns: ColumnState[];
}>();

const emit = defineEmits<{
  close: [];
  toggle: [colId: string, visible: boolean];
  reset: [];
}>();

const popoverRef = ref<HTMLElement | null>(null);
const searchQuery = ref('');

// Positioning State
const pos = ref({ top: 0, left: 0 });
const widthPx = ref(340);

// Filtering & Grouping
const filteredColumns = computed<ColumnGroup[]>(() => {
  const grouped = new Map<string, ColumnGroup>();
  
  props.columns.forEach(col => {
    if (!grouped.has(col.headerName)) {
      grouped.set(col.headerName, { ...col, ids: [col.colId] });
    } else {
      grouped.get(col.headerName)?.ids.push(col.colId);
    }
  });

  let result = Array.from(grouped.values());

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(c => c.headerName.toLowerCase().includes(q));
  }
  
  return result;
});

// Counts  
const totalColumns = computed(() => filteredColumns.value.length);
// All columns (unfiltered) for totals display
const allColumnGroups = computed(() => {
  const grouped = new Map<string, ColumnGroup>();
  props.columns.forEach(col => {
    if (!grouped.has(col.headerName)) {
      grouped.set(col.headerName, { ...col, ids: [col.colId] });
    } else {
      grouped.get(col.headerName)?.ids.push(col.colId);
    }
  });
  return Array.from(grouped.values());
});
const totalAllColumns = computed(() => allColumnGroups.value.length);
const allVisibleCount = computed(() => allColumnGroups.value.filter(c => c.visible).length);

const toggleGroup = (group: ColumnGroup, visible: boolean) => {
  group.ids.forEach((id: string) => {
    emit('toggle', id, visible);
  });
};

// Bulk actions
const selectAll = () => {
  filteredColumns.value.forEach((group) => {
    if (!group.visible) {
      toggleGroup(group, true);
    }
  });
};

const deselectAll = () => {
  filteredColumns.value.forEach((group) => {
    if (group.visible) {
      toggleGroup(group, false);
    }
  });
};

// Positioning Logic
const updatePosition = () => {
  if (!import.meta.client || !props.open || !props.trigger || !popoverRef.value) return;

  const rect = props.trigger.getBoundingClientRect();
  const margin = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const popW = widthPx.value;
  const popH = Math.min(popoverRef.value.offsetHeight || 400, vh - 20);

  let top = 0;
  let left = 0;

  if (props.trigger) {
    top = rect.bottom + margin;
    if (top + popH > vh - margin) {
      top = Math.max(margin, rect.top - popH - margin);
    }
    left = rect.right - popW;
    if (left < margin) left = rect.left;
    left = Math.max(margin, Math.min(left, vw - popW - margin));
  } else {
    top = (vh - popH) / 2;
    left = (vw - popW) / 2;
  }

  pos.value = { top, left };
};

const stylePosition = computed(() => ({
  top: `${pos.value.top}px`,
  left: `${pos.value.left}px`,
  width: `${widthPx.value}px`,
}));

// Listeners
const onOutsideClick = (event: MouseEvent) => {
  if (!props.open || !popoverRef.value) return;
  const target = event.target as Node;
  
  if (popoverRef.value.contains(target)) return;
  if (props.trigger && props.trigger.contains(target)) return;
  
  emit('close');
};

const onResize = () => {
  updatePosition();
};

const setupListeners = () => {
  if (!import.meta.client) return;
  window.addEventListener('resize', onResize);
  window.addEventListener('scroll', onResize, true);
  window.addEventListener('mousedown', onOutsideClick, true);
};

const teardownListeners = () => {
  if (!import.meta.client) return;
  window.removeEventListener('resize', onResize);
  window.removeEventListener('scroll', onResize, true);
  window.removeEventListener('mousedown', onOutsideClick, true);
};

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      nextTick(() => {
        updatePosition();
        setupListeners();
      });
    } else {
      teardownListeners();
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  teardownListeners();
});
</script>

<template>
  <Teleport to="body">
    <transition name="fade">
      <div
        v-if="open"
        ref="popoverRef"
        class="fixed z-[100] rounded-[var(--card-radius)] border shadow-2xl overflow-hidden bg-[hsl(var(--card))] border-[hsl(var(--border))] text-[hsl(var(--foreground))]"
        :style="stylePosition"
      >
        <!-- Header -->
        <div class="px-4 py-3 flex items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
          <p class="text-[11px] uppercase tracking-wider font-semibold text-[hsl(var(--muted-foreground))]">
            Configura Colonne
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
          <!-- Search with counter -->
          <div>
            <label class="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide mb-1.5 text-[hsl(var(--muted-foreground))]">
              <span>Cerca colonne</span>
              <span class="text-[10px]">
                Visibili: {{ allVisibleCount }} / {{ totalAllColumns }}
              </span>
            </label>
            <div class="relative">
              <Icon
                name="heroicons:magnifying-glass"
                class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]"
              />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Cerca..."
                class="w-full py-2 rounded-lg text-sm transition-colors border bg-[hsl(var(--card))] border-[hsl(var(--border))] text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--ring))] focus:ring-1 focus:ring-[hsl(var(--ring)/0.6)] pl-9 pr-3"
              >
            </div>
          </div>

          <!-- Quick actions -->
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="text-xs px-2.5 py-1 rounded-lg border transition border-[hsl(var(--success)/0.5)] text-[hsl(var(--success))] hover:bg-[hsl(var(--success)/0.14)]"
              @click="selectAll"
            >
              Seleziona tutte
            </button>
            <button
              type="button"
              class="text-xs px-2.5 py-1 rounded-lg border transition border-[hsl(var(--warning)/0.5)] text-[hsl(var(--warning))] hover:bg-[hsl(var(--warning)/0.12)]"
              @click="deselectAll"
            >
              Deseleziona tutte
            </button>
            <button
              type="button"
              class="text-xs px-2.5 py-1 rounded-lg border transition border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
              @click="emit('reset')"
            >
              Ripristina default
            </button>
          </div>
        </div>

        <!-- Columns list -->
        <div class="border-t border-[hsl(var(--border))]">
          <div class="px-4 py-2 text-[10px] uppercase tracking-wider font-semibold text-[hsl(var(--muted-foreground))] bg-[hsl(var(--secondary))]">
            Colonne disponibili ({{ totalColumns }})
          </div>
          
          <div class="max-h-64 overflow-y-auto">
            <div v-if="filteredColumns.length === 0" class="px-4 py-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
              Nessuna colonna trovata.
            </div>
            <button
              v-for="col in filteredColumns"
              :key="col.colId"
              type="button"
              class="w-full text-left px-4 py-2.5 flex items-center gap-3 text-sm border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]"
              @click="toggleGroup(col, !col.visible)"
            >
              <input
                type="checkbox"
                class="h-4 w-4 rounded border-[hsl(var(--border))] text-[hsl(var(--primary))] focus:ring-[hsl(var(--ring)/0.6)]"
                :checked="col.visible"
                @click.stop="toggleGroup(col, !col.visible)"
              >
              <span class="flex-1 truncate">{{ col.headerName }}</span>
            </button>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-4 py-3 flex items-center justify-end border-t border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
          <button
            type="button"
            class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/0.6)]"
            @click="emit('close')"
          >
            <Icon name="heroicons:check" class="w-4 h-4" />
            Chiudi
          </button>
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
