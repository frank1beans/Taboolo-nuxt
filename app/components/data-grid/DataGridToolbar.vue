<template>
  <div class="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-slate-200 bg-slate-50/70">
    <div class="flex items-center gap-2 flex-1 min-w-[260px]">
      <UInput
        v-model="searchModel"
        :placeholder="placeholder"
        size="md"
        clearable
        class="w-full min-w-[260px]"
        @keydown.enter.prevent="$emit('apply-filter')"
        @clear="$emit('clear-filter')"
      />
    </div>
    <div class="flex items-center gap-2">
      <UButton
        v-if="enableReset"
        color="gray"
        variant="ghost"
        size="md"
        icon="i-heroicons-arrow-path"
        class="px-4 hover:bg-slate-200 hover:text-slate-900"
        @click="$emit('clear-filter')"
      >
        Reset
      </UButton>
      <UButton
        color="primary"
        size="md"
        icon="i-heroicons-funnel"
        class="px-5 hover:brightness-95 active:scale-[0.99] transition"
        @click="$emit('apply-filter')"
      >
        Filtra
      </UButton>
      <UButton
        v-if="enableExport"
        color="gray"
        variant="solid"
        size="md"
        icon="i-heroicons-arrow-down-tray"
        class="px-4"
        @click="$emit('export')"
      >
        Esporta
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  modelValue: string;
  placeholder?: string;
  enableReset?: boolean;
  enableExport?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'apply-filter': [];
  'clear-filter': [];
  export: [];
}>();

const searchModel = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});
</script>
