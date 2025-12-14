<script setup lang="ts">
import { computed } from 'vue';
const colorMode = useColorMode();

const isDark = computed(() => colorMode.value === 'dark');
const iconName = computed(() => (isDark.value ? 'heroicons:sun' : 'heroicons:moon'));
const label = computed(() => (isDark.value ? 'Passa al tema chiaro' : 'Passa al tema scuro'));

const toggle = () => {
  colorMode.preference = isDark.value ? 'light' : 'dark';
};
</script>

<template>
  <UTooltip :text="label">
    <UButton
      color="primary"
      variant="soft"
      size="sm"
      class="shadow-sm interactive-touch"
      @click="toggle"
    >
      <ClientOnly>
        <template #fallback>
          <div class="w-5 h-5" />
        </template>
        <Icon
          :name="iconName"
          class="w-5 h-5 transition-transform duration-500 rotate-0 dark:rotate-180"
        />
      </ClientOnly>
    </UButton>
  </UTooltip>
</template>
