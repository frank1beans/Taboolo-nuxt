<template>
  <aside
    v-if="visible"
    class="w-72 bg-white border-r border-slate-200 h-full flex flex-col shadow-sm"
  >
    <div class="px-3 py-2 border-b border-slate-200 flex items-center justify-between bg-slate-50">
      <div class="text-sm font-semibold text-slate-800">WBS</div>
      <div class="flex items-center gap-1">
        <UButton
          icon="i-heroicons-arrows-pointing-out"
          color="gray"
          variant="ghost"
          size="xs"
          title="Collassa tutto"
          @click="collapseAll"
        />
        <UButton
          icon="i-heroicons-x-mark"
          color="gray"
          variant="ghost"
          size="xs"
          title="Chiudi sidebar"
          @click="toggleVisible(false)"
        />
      </div>
    </div>
    <div class="flex-1 overflow-y-auto">
      <ul class="p-2 space-y-1 text-sm">
        <li
          v-for="node in nodes"
          :key="node.id"
          class="rounded border border-transparent hover:border-slate-200"
        >
          <UButton
            variant="ghost"
            color="gray"
            size="sm"
            class="w-full justify-start px-2 py-1 flex items-center gap-2 hover:bg-slate-50"
            @click="selectNode(node)"
          >
            <span class="text-xs font-mono text-slate-500">{{ node.code }}</span>
            <span class="font-medium text-slate-800">{{ node.name }}</span>
            <span v-if="showLevel" class="text-[11px] text-slate-500">L{{ node.level }}</span>
          </UButton>
          <ul v-if="node.children?.length" class="ml-4 border-l border-slate-200 pl-2 space-y-1">
            <li
              v-for="child in node.children"
              :key="child.id"
              class="rounded border border-transparent hover:border-slate-200"
            >
              <UButton
                variant="ghost"
                color="gray"
                size="sm"
                class="w-full justify-start px-2 py-1 flex items-center gap-2 hover:bg-slate-50"
                @click="selectNode(child)"
              >
                <span class="text-xs font-mono text-slate-500">{{ child.code }}</span>
                <span class="text-slate-800">{{ child.name }}</span>
                <span v-if="showLevel" class="text-[11px] text-slate-500">L{{ child.level }}</span>
              </UButton>
            </li>
          </ul>
        </li>
      </ul>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { WbsNode } from '~/types/wbs';

const props = withDefaults(
  defineProps<{
    modelValue?: boolean;
    visible?: boolean;
    projectId?: string;
    showLevel?: boolean;
  }>(),
  {
    modelValue: true,
    visible: true,
    projectId: undefined,
    showLevel: false,
  }
);

const emit = defineEmits<{
  'update:visible': [value: boolean];
  'node-selected': [node: WbsNode | null];
}>();

const visible = ref(props.visible ?? props.modelValue ?? true);

watch(
  () => props.visible,
  (val) => {
    if (val !== undefined) visible.value = val;
  }
);

type SimpleWbsNode = { id: string; code: string; name: string; level: number; children?: SimpleWbsNode[] };

const nodes = ref<SimpleWbsNode[]>([
  { id: 'wbs-1', code: '01', name: 'Strutture', level: 1 },
  {
    id: 'wbs-2',
    code: '02',
    name: 'Architettoniche',
    level: 1,
    children: [
      { id: 'wbs-2-1', code: '02.01', name: 'Tamponamenti', level: 2 },
      { id: 'wbs-2-2', code: '02.02', name: 'Finiture', level: 2 },
    ],
  },
  { id: 'wbs-3', code: '03', name: 'Impianti', level: 1 },
]);

const selectNode = (node: SimpleWbsNode) => emit('node-selected', node as unknown as WbsNode);
const toggleVisible = (val: boolean) => emit('update:visible', val);
const collapseAll = () => emit('node-selected', null);
</script>
