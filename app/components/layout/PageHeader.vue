<script setup lang="ts">
/**
 * PageHeader.vue
 * 
 * Standardized page header component.
 * 
 * Layout:
 * [LeftSlot?] [Title/Meta Block] ................. [RightSlot?]
 * [Divider?]
 * [Toolbar Slot?]
 */
import { useSlots } from 'vue'

const props = withDefaults(defineProps<{
  title: string
  meta?: string
  divider?: boolean
}>(), {
  divider: true
})

defineSlots<{
  default?: (props: {}) => any
  leftSlot?: (props: {}) => any
  rightSlot?: (props: {}) => any
  meta?: (props: {}) => any // Optional slot for complex meta content
  toolbar?: (props: {}) => any // Optional slot below divider
}>()
</script>

<template>
  <div class="page-header w-full flex flex-col">
    <!-- Main Row -->
    <div class="flex flex-row items-center gap-4 min-h-[40px]">
      
      <!-- Optional Left Column (Back button, etc) -->
      <div v-if="$slots.leftSlot" class="flex-shrink-0">
        <slot name="leftSlot" />
      </div>

      <!-- Title & Meta Column (Left Aligned, Grows) -->
      <div class="flex flex-col flex-1 min-w-0 justify-center gap-[var(--gap-title-meta)]">
        
        <!-- Title -->
        <h1 class="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))] leading-tight truncate">
          {{ title }}
        </h1>

        <!-- Meta Line -->
        <div v-if="meta || $slots.meta" class="text-xs font-medium text-[hsl(var(--muted-foreground))] flex items-center gap-2 truncate min-h-[16px]">
          <slot name="meta">
            {{ meta }}
          </slot>
        </div>
      </div>

      <!-- Right Actions Column (Right Aligned, No Shrink) -->
      <div v-if="$slots.rightSlot" class="flex-shrink-0 flex items-center gap-3 ml-4">
        <slot name="rightSlot" />
      </div>

    </div>

    <!-- Divider -->
    <div 
        v-if="divider" 
        class="w-full border-b border-[hsl(var(--border))]" 
        style="margin-top: var(--gap-after); margin-bottom: var(--gap-after);"
    ></div>

    <!-- Optional Toolbar (Below Divider) -->
     <div v-if="$slots.toolbar" class="w-full mb-4">
        <slot name="toolbar" />
    </div>

  </div>
</template>

<style scoped>
.page-header {
  /* Use global variables or defaults */
  --gap-title-meta: var(--header-gap-title-meta, 6px);
  --gap-after: var(--header-gap-after, 16px);
}
</style>
