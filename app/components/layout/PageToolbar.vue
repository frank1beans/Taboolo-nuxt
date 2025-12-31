<template>
  <div class="page-toolbar flex items-center gap-4 py-1 w-full">
    <!-- Search / Left Slot -->
    <div class="flex items-center gap-3 flex-1">
      
      <!-- Desktop Search (Visible on md+) -->
      <div v-if="showSearch" class="hidden md:block search-container relative flex-1 max-w-2xl">
        <Icon 
          name="heroicons:magnifying-glass" 
          class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-[hsl(var(--muted-foreground)/0.5)]"
        />
        <input
          :value="modelValue"
          :placeholder="searchPlaceholder"
          class="w-full h-8 pl-9 pr-8 
                 bg-transparent
                 border-none
                 rounded-md
                 text-sm text-[hsl(var(--foreground))] 
                 placeholder:text-[hsl(var(--muted-foreground)/0.5)]
                 transition-colors duration-150
                 hover:bg-[hsl(var(--muted)/0.3)]
                 focus:bg-[hsl(var(--muted)/0.4)]
                 focus:outline-none"
          @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
          @keydown.enter.prevent="$emit('search')"
        >
        <!-- Clear button -->
        <button
          v-if="modelValue"
          class="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded
                 text-[hsl(var(--muted-foreground)/0.5)] 
                 hover:text-[hsl(var(--foreground))]
                 transition-colors"
          @click="$emit('update:modelValue', '')"
        >
          <Icon name="heroicons:x-mark" class="w-3.5 h-3.5" />
        </button>
      </div>

       <!-- Mobile Search (Visible on < md) -->
       <div v-if="showSearch" class="block md:hidden">
          <UPopover mode="click" :popper="{ placement: 'bottom-start' }">
             <UButton 
               icon="i-heroicons-magnifying-glass" 
               color="gray" 
               variant="ghost" 
               class="text-[hsl(var(--muted-foreground))]" 
             />
             <template #panel>
                <div class="p-2 w-64">
                   <div class="relative w-full">
                      <Icon 
                        name="heroicons:magnifying-glass" 
                        class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-[hsl(var(--muted-foreground)/0.5)]"
                      />
                      <input
                        :value="modelValue"
                        :placeholder="searchPlaceholder"
                        class="w-full h-8 pl-9 pr-8 
                              bg-[hsl(var(--muted)/0.3)]
                              border-none
                              rounded-md
                              text-sm text-[hsl(var(--foreground))] 
                              placeholder:text-[hsl(var(--muted-foreground)/0.5)]
                              focus:bg-[hsl(var(--muted)/0.5)]
                              focus:outline-none"
                        autofocus
                        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
                        @keydown.enter.prevent="$emit('search')"
                      >
                   </div>
                </div>
             </template>
          </UPopover>
       </div>
      
      <slot name="left" />
    </div>
    
    <!-- Right Actions - Notion-style minimal buttons -->
    <div class="flex items-center gap-1.5">
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
