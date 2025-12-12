<script setup lang="ts">
interface FilterSidebarProps {
  open: boolean
  title?: string
  description?: string
}

const props = withDefaults(defineProps<FilterSidebarProps>(), {
  title: 'Filtri',
  description: undefined
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  close: []
}>()

const handleClose = () => {
  emit('update:open', false)
  emit('close')
}
</script>

<template>
  <USlideover :model-value="open" @update:model-value="(val) => emit('update:open', val)">
    <UCard
      class="flex flex-col flex-1"
      :ui="{
        body: { base: 'flex-1 overflow-y-auto' },
        ring: '',
        divide: 'divide-y divide-gray-100 dark:divide-gray-800'
      }"
    >
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              {{ title }}
            </h3>
            <p v-if="description" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ description }}
            </p>
          </div>
          <UButton
            color="gray"
            variant="ghost"
            icon="i-lucide-x"
            square
            @click="handleClose"
          />
        </div>
      </template>

      <!-- Filter content slot -->
      <slot />

      <template #footer>
        <div class="flex items-center justify-between gap-3">
          <slot name="footer-actions">
            <UButton
              variant="outline"
              color="gray"
              block
              @click="handleClose"
            >
              Chiudi
            </UButton>
          </slot>
        </div>
      </template>
    </UCard>
  </USlideover>
</template>
