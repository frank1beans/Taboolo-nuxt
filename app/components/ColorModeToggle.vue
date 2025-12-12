<script setup lang="ts">
const colorMode = useColorMode();

const toggleMode = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark';
};

const iconName = computed(() =>
  colorMode.value === 'dark' ? 'i-heroicons-sun' : 'i-heroicons-moon',
);
</script>

<template>
  <UButton
    variant="ghost"
    size="xs"
    class="rounded-full p-1"
    aria-label="Toggle color mode"
    @click="toggleMode"
  >
    <UIcon :name="iconName" class="h-4 w-4 text-slate-600 dark:text-slate-200" />
  </UButton>
</template>
