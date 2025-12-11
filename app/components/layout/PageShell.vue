<script setup lang="ts">
import { computed, useSlots } from 'vue'
import { UBreadcrumb } from '#components'

type BreadcrumbLink = {
  label: string
  to?: string
}

const props = withDefaults(defineProps<{
  title: string
  description?: string
  breadcrumb?: BreadcrumbLink[]
  bodyClass?: string
  class?: string
  stickyToolbar?: boolean
}>(), {
  description: '',
  bodyClass: '',
  class: '',
  breadcrumb: () => [],
  stickyToolbar: false,
})

const slots = useSlots()

const hasBreadcrumb = computed(() => props.breadcrumb.length || !!slots.breadcrumb)
const hasToolbar = computed(() => !!slots.toolbar)
</script>

<template>
  <div :class="['workspace-shell', props.class]">
    <div class="workspace-inner">
      <div v-if="hasBreadcrumb" class="workspace-breadcrumb">
        <slot name="breadcrumb">
          <UBreadcrumb
            :links="props.breadcrumb"
            size="sm"
            :ui="{
              root: 'px-0',
              list: 'gap-2 text-xs text-muted-foreground',
              item: 'text-xs text-muted-foreground',
              separatorIcon: 'text-muted-foreground',
              link: 'text-xs text-foreground hover:text-primary font-medium'
            }"
          />
        </slot>
      </div>

      <div class="workspace-header">
        <div class="workspace-heading">
          <h1 class="workspace-title">
            {{ props.title }}
          </h1>
          <p v-if="props.description" class="workspace-subtitle">
            {{ props.description }}
          </p>
        </div>
        <div v-if="slots.headerAside" class="workspace-header-aside">
          <slot name="headerAside" />
        </div>
      </div>

      <div
        v-if="hasToolbar"
        :class="[
          'workspace-toolbar',
          props.stickyToolbar ? 'sticky top-[74px] z-20 backdrop-blur bg-card/90' : '',
        ]"
      >
        <slot name="toolbar" />
      </div>

      <div :class="['workspace-body', props.bodyClass]">
        <slot />
      </div>
    </div>
  </div>
</template>
