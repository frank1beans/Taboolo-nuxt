<script setup lang="ts">
import { computed } from 'vue';

export type TableActionItem = {
  label: string;
  icon?: string;
  click?: () => void;
  disabled?: boolean;
  color?: 'red' | 'gray' | 'white' | 'primary' | 'black'; // Nuxt UI colors
  slot?: string; // If we need custom slots
};

const props = defineProps<{
  items: TableActionItem[][]; // Array of arrays for grouped items
}>();

const menuItems = computed(() => {
  return props.items?.map(group => 
    group.map(item => ({
      ...item,
      onSelect: () => {
        if (item.click) item.click();
      }
    }))
  ) || [];
});

const hasItems = computed(() => {
    return props.items && props.items.some(group => group && group.length > 0);
});
</script>

<template>
  <div class="flex items-center justify-center h-full w-full relative">
    <UDropdownMenu
      :items="menuItems"
      :ui="{
        content: 'w-48 relative z-50',
      }"
      :popper="{ placement: 'bottom-end', strategy: 'fixed' }"
    >
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-heroicons-ellipsis-horizontal"
        size="xs"
        class="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
        @click.stop
      />
      
      <template #item="{ item }">
        <span class="truncate">{{ item.label }}</span>
      </template>
    </UDropdownMenu>
  </div>
</template>
