<template>
  <div class="flex flex-wrap items-center gap-4 py-4 bg-transparent w-full">
    <!-- Search / Left Slot -->
    <div class="flex items-center gap-2 flex-1 min-w-[320px]">
      <!-- Default Search Implementation -->
      <div v-if="showSearch" class="relative w-full max-w-lg">
        <Icon 
          name="heroicons:magnifying-glass" 
          class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none text-[hsl(var(--muted-foreground))]"
        />
        <UInput
          :model-value="modelValue"
          :placeholder="searchPlaceholder"
          size="xl"
          variant="none"
          class="w-full"
          :ui="{
            base: 'w-full h-9 pl-11 pr-4 bg-[hsl(var(--background))] border border-transparent hover:border-[hsl(var(--border))] focus:border-[hsl(var(--primary))] rounded-xl transition-all shadow-sm text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))]'
          }"
          @update:model-value="(val) => $emit('update:modelValue', val)"
          @keydown.enter.prevent="$emit('search')"
          @clear="$emit('update:modelValue', '')"
        >
          <template #trailing v-if="modelValue">
             <UButton
              color="neutral"
              variant="link"
              icon="i-heroicons-x-mark-20-solid"
              :padded="false"
              @click="$emit('update:modelValue', '')"
            />
          </template>
        </UInput>
      </div>
      
      <!-- Optional Extra Left Content -->
      <slot name="left" />
    </div>
    
    <!-- Right Actions -->
    <div class="flex items-center gap-3 justify-end">
      <slot name="right" />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  modelValue?: string
  searchPlaceholder?: string
  showSearch?: boolean
}>(), {
  modelValue: '',
  searchPlaceholder: 'Cerca...',
  showSearch: true
})

defineEmits<{
  'update:modelValue': [value: string]
  'search': []
}>()
</script>
