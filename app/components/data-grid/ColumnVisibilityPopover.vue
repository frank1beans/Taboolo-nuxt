<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

interface ColumnState {
  colId: string;
  headerName: string;
  visible: boolean;
}

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
const placement = ref<'left' | 'right'>('right');
const pos = ref({ top: 0, left: 0 });
const widthPx = ref(300);

// Filtering
const filteredColumns = computed(() => {
  if (!searchQuery.value) return props.columns;
  const q = searchQuery.value.toLowerCase();
  return props.columns.filter(c => c.headerName.toLowerCase().includes(q));
});

// Positioning Logic (Adapted from ColumnFilterPopover)
const updatePosition = () => {
  if (!process.client || !props.open || !props.trigger || !popoverRef.value) return;

  const rect = props.trigger.getBoundingClientRect();
  const margin = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const popW = widthPx.value;
  const popH = Math.min(popoverRef.value.offsetHeight || 400, vh - 20);

  // Fallback if trigger is missing
  
  let top = 0;
  let left = 0;

  if (props.trigger) {
      // Normal positioning
      top = rect.bottom + margin;
      if (top + popH > vh - margin) {
         top = Math.max(margin, rect.top - popH - margin);
      }
      left = rect.right - popW;
      if (left < margin) left = rect.left;
      left = Math.max(margin, Math.min(left, vw - popW - margin));
  } else {
      // Center fallback
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
  if (!process.client) return;
  window.addEventListener('resize', onResize);
  window.addEventListener('scroll', onResize, true);
  window.addEventListener('mousedown', onOutsideClick, true);
};

const teardownListeners = () => {
  if (!process.client) return;
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
        class="fixed z-[100] rounded-xl border shadow-xl overflow-hidden bg-[hsl(var(--card))] border-[hsl(var(--border))] text-[hsl(var(--foreground))]"
        :style="stylePosition"
      >
        <!-- Header -->
        <div class="px-3 py-2 flex items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))]">
          <p class="text-[11px] uppercase tracking-wider font-semibold text-[hsl(var(--muted-foreground))]">
            Configura Colonne
          </p>
          <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark-20-solid" size="xs" :padded="false" @click="$emit('close')" />
        </div>

        <!-- Search -->
        <div class="p-2 border-b border-[hsl(var(--border))]">
          <UInput
            v-model="searchQuery"
            icon="i-heroicons-magnifying-glass-20-solid"
            placeholder="Cerca..."
            size="xs"
            :ui="{ icon: { trailing: { pointer: '' } } }"
            autofocus
          >
             <template #trailing>
                <UButton
                  v-show="searchQuery !== ''"
                  color="neutral"
                  variant="link"
                  icon="i-heroicons-x-mark-20-solid"
                  :padded="false"
                  size="xs"
                  @click="searchQuery = ''"
                />
              </template>
          </UInput>
        </div>

        <!-- List -->
        <div class="max-h-[240px] overflow-y-auto p-1 space-y-0.5">
          <div v-if="filteredColumns.length === 0" class="text-xs text-[hsl(var(--muted-foreground))] text-center py-2">
            Nessuna colonna
          </div>
          <div
            v-for="col in filteredColumns"
            :key="col.colId"
            class="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-[hsl(var(--muted))] cursor-pointer group"
            @click="$emit('toggle', col.colId, !col.visible)"
          >
            <span class="text-sm text-[hsl(var(--foreground))] select-none">{{ col.headerName }}</span>
             <div class="relative flex items-center" @click.stop>
               <UCheckbox :model-value="col.visible" size="sm" @update:model-value="(val: any) => $emit('toggle', col.colId, !!val)" />
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-3 py-2 border-t border-[hsl(var(--border))] bg-[hsl(var(--secondary))] flex justify-between">
            <button
               type="button"
               class="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors"
               @click="$emit('reset')"
            >
              Ripristina default
            </button>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 100ms ease, transform 100ms ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
