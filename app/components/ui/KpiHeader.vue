<template>
  <div class="kpi-header">
    <div class="kpi-header__grid" :class="gridClass">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  columns?: 2 | 3 | 4 | 5 | 6
}>(), {
  columns: 4
})

const gridClass = computed(() => `kpi-header__grid--${props.columns}`)
</script>

<style scoped>
.kpi-header {
  padding: 0 0 0.75rem 0;
}

.kpi-header__grid {
  display: grid;
  gap: 0.75rem;
}

.kpi-header__grid--2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.kpi-header__grid--3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.kpi-header__grid--4 {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.kpi-header__grid--5 {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.kpi-header__grid--6 {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

@media (max-width: 1024px) {
  .kpi-header__grid--4,
  .kpi-header__grid--5,
  .kpi-header__grid--6 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .kpi-header__grid {
    grid-template-columns: 1fr;
  }
}
</style>
