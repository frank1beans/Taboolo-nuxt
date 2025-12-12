<script setup lang="ts">
import { ref, computed, toRefs, h, defineComponent, type PropType } from 'vue'
import { cn } from '@/lib/utils'
import type { FrontendWbsNode } from '@/types/api'
import { UIcon } from '#components'

export interface WbsFilterPanelProps {
  nodes: FrontendWbsNode[]
  selectedNodeId?: string | null
  title?: string
  enableSearch?: boolean
  showAmounts?: boolean
  autoExpandLevel?: number
}

const props = withDefaults(defineProps<WbsFilterPanelProps>(), {
  selectedNodeId: null,
  title: 'Filtro WBS',
  enableSearch: true,
  showAmounts: true,
  autoExpandLevel: 1,
})

const { nodes, selectedNodeId, title, enableSearch, showAmounts, autoExpandLevel } = toRefs(props)

const emit = defineEmits<{
  nodeSelect: [nodeId: string | null]
  close: []
  select: [nodeId: string]
}>()

const searchQuery = ref('')

const clearSearch = () => {
  searchQuery.value = ''
}

const clearSelection = () => {
  emit('nodeSelect', null)
}

// Recursive node component
const WbsNodeItem = defineComponent({
  name: 'WbsNodeItem',
  props: {
    node: {
      type: Object as PropType<FrontendWbsNode>,
      required: true,
    },
    level: {
      type: Number,
      required: true,
    },
    selectedNodeId: {
      type: String as PropType<string | null>,
      default: null,
    },
    searchQuery: {
      type: String,
      default: '',
    },
    autoExpandLevel: {
      type: Number,
      default: 1,
    },
    showAmounts: {
      type: Boolean,
      default: true,
    },
  },
  emits: {
    select: (_nodeId: string) => true,
  },
  setup(props, { emit }) {
    const isExpanded = ref(props.level <= props.autoExpandLevel)

    const hasChildren = computed(() => props.node.children && props.node.children.length > 0)
    const isSelected = computed(() => props.selectedNodeId === props.node.id)

    // Check if node matches search
    const matchesSearch = computed(() => {
      if (!props.searchQuery) return true
      const query = props.searchQuery.toLowerCase()
      return (
        props.node.code?.toLowerCase().includes(query) ||
        props.node.description?.toLowerCase().includes(query)
      )
    })

    // Check if any children match search (recursive)
    const hasMatchingChildren = computed(() => {
      if (!props.searchQuery || !hasChildren.value) return false

      const checkNode = (n: FrontendWbsNode): boolean => {
        const query = props.searchQuery.toLowerCase()
        const matches =
          n.code?.toLowerCase().includes(query) ||
          n.description?.toLowerCase().includes(query)

        if (matches) return true
        if (n.children) {
          return n.children.some((child) => checkNode(child))
        }
        return false
      }

      return props.node.children.some((child: FrontendWbsNode) => checkNode(child))
    })

    const shouldShow = computed(() => matchesSearch.value || hasMatchingChildren.value)

    const actuallyExpanded = computed(() =>
      props.searchQuery ? hasMatchingChildren.value || isExpanded.value : isExpanded.value
    )

    const NodeIcon = computed(() => {
      if (props.node.level <= 5) return 'i-lucide-map-pin'
      if (hasChildren.value) {
        return actuallyExpanded.value ? 'i-lucide-folder-open' : 'i-lucide-folder'
      }
      return 'i-lucide-file-text'
    })

    const iconColor = computed(() => {
      if (props.node.level <= 5) return 'text-blue-500'
      if (hasChildren.value) return 'text-muted-foreground'
      return 'text-muted-foreground/80'
    })

    const toggleExpand = () => {
      if (hasChildren.value) {
        isExpanded.value = !isExpanded.value
      }
    }

    const handleSelect = () => {
      emit('select', props.node.id)
    }

    return {
      isExpanded,
      hasChildren,
      isSelected,
      shouldShow,
      actuallyExpanded,
      NodeIcon,
      iconColor,
      toggleExpand,
      handleSelect,
      formatAmount: (amount: number) =>
        amount.toLocaleString('it-IT', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
    }
  },
  render() {
    if (!this.shouldShow) return null

    const paddingLeft = `${this.level * 12 + 8}px`

    return h('div', [
      h(
        'div',
        {
          class: cn(
            'group flex items-center gap-2 py-2 px-2 cursor-pointer transition-all',
            'hover:bg-muted/60 rounded-md',
            this.isSelected && 'bg-primary/10 border border-primary/20'
          ),
          style: { paddingLeft },
          onClick: this.handleSelect,
        },
        [
          // Expand/collapse button
          this.hasChildren
            ? h(
                'button',
                {
                  class: 'flex-shrink-0 text-muted-foreground hover:text-foreground',
                  onClick: (e: Event) => {
                    e.stopPropagation()
                    this.toggleExpand()
                  },
                },
                [
                  h(UIcon, {
                    name: this.actuallyExpanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right',
                    class: 'h-3.5 w-3.5',
                  }),
                ]
              )
            : h('div', { class: 'w-3.5' }),

          // Icon
          h(UIcon, { name: this.NodeIcon, class: cn('h-4 w-4 flex-shrink-0', this.iconColor) }),

          // Code
          this.node.code
            ? h(
                'span',
                { class: 'font-mono text-xs text-muted-foreground min-w-[4rem]' },
                this.node.code
              )
            : null,

          // Description
          h(
            'span',
            { class: 'flex-1 text-sm truncate' },
            this.node.description ?? 'Senza descrizione'
          ),

          // Amount
          this.showAmounts
            ? h(
                'span',
                { class: 'text-xs font-mono text-muted-foreground min-w-[6rem] text-right' },
                this.formatAmount(this.node.amount)
              )
            : null,
        ]
      ),

      // Children
      this.hasChildren && this.actuallyExpanded
        ? h(
            'div',
            this.node.children.map((child: FrontendWbsNode) =>
              h(WbsNodeItem, {
                key: child.id,
                node: child,
                level: this.level + 1,
                selectedNodeId: this.selectedNodeId,
                searchQuery: this.searchQuery,
                autoExpandLevel: this.autoExpandLevel,
                showAmounts: this.showAmounts,
                onSelect: (id: string) => this.$emit('select', id),
              })
            )
          )
        : null,
    ])
  },
})
</script>

<template>
  <div class="flex flex-col h-full border rounded-lg bg-card overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b bg-muted/30">
      <h3 class="text-sm font-semibold">{{ title }}</h3>
      <Button v-if="selectedNodeId" size="sm" variant="ghost" @click="clearSelection">
        <UIcon name="i-lucide-x" class="h-4 w-4 mr-1" />
        Cancella
      </Button>
    </div>

    <!-- Search -->
    <div v-if="enableSearch" class="p-3 border-b">
      <div class="relative">
        <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          v-model="searchQuery"
          type="search"
          placeholder="Cerca codice o descrizione..."
          class="pl-9"
        />
        <button
          v-if="searchQuery"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          @click="clearSearch"
        >
          <UIcon name="i-lucide-x" class="h-4 w-4" />
        </button>
      </div>
    </div>

    <!-- Selected node badge -->
    <div v-if="selectedNodeId" class="px-3 py-2 border-b bg-primary/5">
      <Badge variant="secondary" class="text-xs">
        Filtro attivo
      </Badge>
    </div>

    <!-- Tree -->
    <div class="flex-1 overflow-y-auto p-2">
      <template v-if="nodes.length > 0">
        <WbsNodeItem
          v-for="rootNode in nodes"
          :key="rootNode.id"
          :node="rootNode"
          :level="0"
          :selected-node-id="selectedNodeId"
          :search-query="searchQuery"
          :auto-expand-level="autoExpandLevel"
          :show-amounts="showAmounts"
          @select="(id) => emit('nodeSelect', id)"
        />
      </template>
      <div v-else class="p-6 text-center text-muted-foreground text-sm">
        Nessuna voce WBS disponibile
      </div>
    </div>
  </div>
</template>
