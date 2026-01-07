<template>
  <div class="page-toolbar w-full h-12 flex items-center">
    <div
      class="w-full grid items-center gap-4"
      :class="centered
        ? 'grid-cols-[1fr_minmax(0,32rem)_1fr]'
        : 'grid-cols-[minmax(0,1fr)_auto]'"
    >
      <!-- LEFT -->
      <div class="flex items-center gap-3 min-w-0">
        <!-- Mobile Search (< md) -->
        <div v-if="showSearch" class="md:hidden">
          <UPopover mode="click" :popper="{ placement: 'bottom-start' }">
            <UButton
              icon="i-heroicons-magnifying-glass"
              color="gray"
              variant="ghost"
              class="text-[hsl(var(--muted-foreground))]"
              aria-label="Cerca"
            />
            <template #panel>
              <div class="p-2 w-72">
                <div class="relative w-full flex items-center">
                  <Icon
                    name="heroicons:magnifying-glass"
                    class="absolute left-3 w-4 h-4 pointer-events-none text-[hsl(var(--muted-foreground)/0.5)]"
                  />
                  <input
                    :value="modelValue"
                    :placeholder="searchPlaceholder"
                    class="w-full h-9 pl-10 pr-9 rounded-md
                           bg-[hsl(var(--muted)/0.35)]
                           text-sm text-[hsl(var(--foreground))]
                           placeholder:text-[hsl(var(--muted-foreground)/0.5)]
                           focus:bg-[hsl(var(--muted)/0.55)]
                           focus:outline-none"
                    autofocus
                    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
                    @keydown.enter.prevent="$emit('search')"
                  />
                  <button
                    v-if="modelValue"
                    class="absolute right-2 p-1 rounded
                           text-[hsl(var(--muted-foreground)/0.55)]
                           hover:text-[hsl(var(--foreground))]
                           transition-colors"
                    :aria-label="clearLabel"
                    :title="clearLabel"
                    @click="clearSearch"
                  >
                    <Icon name="heroicons:x-mark" class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </template>
          </UPopover>
        </div>

        <slot name="left" />
      </div>

      <!-- CENTER (Desktop search when centered=true) -->
      <div v-if="showSearch && centered" class="hidden md:flex items-center min-w-0">
        <div class="relative w-full flex items-center">
          <Icon
            name="heroicons:magnifying-glass"
            class="absolute left-3 w-5 h-5 pointer-events-none text-[hsl(var(--muted-foreground)/0.5)]"
          />
          <input
            :value="modelValue"
            :placeholder="searchPlaceholder"
            class="w-full h-9 pl-10 pr-9 rounded-md
                   bg-[hsl(var(--card))]
                   border border-[hsl(var(--border))]
                   text-sm font-medium text-[hsl(var(--foreground))]
                   placeholder:text-[hsl(var(--muted-foreground)/0.5)]
                   shadow
                   transition-colors
                   focus:outline-none focus:border-[hsl(var(--primary))] focus:ring-1 focus:ring-[hsl(var(--primary))]"
            @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
            @keydown.enter.prevent="$emit('search')"
          />
          <button
            v-if="modelValue"
            class="absolute right-2 p-1 rounded
                   text-[hsl(var(--muted-foreground)/0.55)]
                   hover:text-[hsl(var(--foreground))]
                   transition-colors"
            :aria-label="clearLabel"
            :title="clearLabel"
            @click="clearSearch"
          >
            <Icon name="heroicons:x-mark" class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- If centered=false, keep everything on the left (search inline on desktop) -->
      <div v-else-if="showSearch && !centered" class="hidden md:flex items-center min-w-0">
        <div class="relative w-full max-w-2xl flex items-center">
          <Icon
            name="heroicons:magnifying-glass"
            class="absolute left-3 w-4 h-4 pointer-events-none text-[hsl(var(--muted-foreground)/0.5)]"
          />
          <input
            :value="modelValue"
            :placeholder="searchPlaceholder"
            class="w-full h-8 pl-9 pr-9 rounded-md
                   bg-transparent
                   text-sm text-[hsl(var(--foreground))]
                   placeholder:text-[hsl(var(--muted-foreground)/0.5)]
                   transition-colors
                   hover:bg-[hsl(var(--muted)/0.3)]
                   focus:bg-[hsl(var(--muted)/0.45)]
                   focus:outline-none"
            @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
            @keydown.enter.prevent="$emit('search')"
          />
          <button
            v-if="modelValue"
            class="absolute right-2 p-1 rounded
                   text-[hsl(var(--muted-foreground)/0.55)]
                   hover:text-[hsl(var(--foreground))]
                   transition-colors"
            :aria-label="clearLabel"
            :title="clearLabel"
            @click="clearSearch"
          >
            <Icon name="heroicons:x-mark" class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- RIGHT -->
      <div
        class="flex items-center gap-1.5 justify-end min-w-0"
        :class="centered ? '' : 'justify-end'"
      >
        <slot name="right" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue?: string
    searchPlaceholder?: string
    showSearch?: boolean
    centered?: boolean
    clearLabel?: string
  }>(),
  {
    modelValue: '',
    searchPlaceholder: 'Cerca...',
    showSearch: true,
    centered: true,
    clearLabel: 'Svuota ricerca',
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  search: []
  clear: []
}>()

const clearSearch = () => {
  emit('update:modelValue', '')
  emit('clear')
}
</script>
