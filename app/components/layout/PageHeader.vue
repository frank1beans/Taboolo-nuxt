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

withDefaults(defineProps<{
  title: string
  meta?: string
  divider?: boolean
}>(), {
  meta: undefined,
  divider: true
})

defineSlots<{
  default?: (props: Record<string, never>) => unknown
  leftSlot?: (props: Record<string, never>) => unknown
  rightSlot?: (props: Record<string, never>) => unknown
  meta?: (props: Record<string, never>) => unknown
  toolbar?: (props: Record<string, never>) => unknown
}>()
</script>

<template>
  <div class="page-header w-full">
    <!-- Main Row - Notion style: clean, minimal -->
    <div class="flex items-center gap-3 min-h-[36px]">
      
      <!-- Optional Left Column (Back button, etc) -->
      <div v-if="$slots.leftSlot" class="flex-shrink-0">
        <slot name="leftSlot" />
      </div>

      <!-- Title & Meta - Notion style: simple, not heavy -->
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <!-- Title -->
        <h1 class="text-base font-semibold text-[hsl(var(--foreground))] truncate">
          {{ title }}
        </h1>

        <!-- Meta Line - inline, subtle -->
        <div v-if="meta || $slots.meta" class="text-[11px] text-[hsl(var(--muted-foreground))] leading-tight flex items-center gap-2 truncate">
          <slot name="meta">
            {{ meta }}
          </slot>
        </div>
      </div>

      <!-- Right Actions -->
      <div v-if="$slots.rightSlot" class="flex-shrink-0 flex items-center gap-1.5">
        <slot name="rightSlot" />
      </div>

    </div>

    <!-- Divider - very subtle or none -->
    <div 
        v-if="divider" 
        class="w-full border-b border-[hsl(var(--border)/0.3)] mt-3 mb-2"
    />

    <!-- Optional Toolbar -->
     <div v-if="$slots.toolbar" class="w-full mt-2">
        <slot name="toolbar" />
    </div>

  </div>
</template>

<style scoped>
.page-header {
  /* Use global variables or defaults - more compact */
  --gap-title-meta: var(--header-gap-title-meta, 4px);
  --gap-after: var(--header-gap-after, 8px);
}
</style>