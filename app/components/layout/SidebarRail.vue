<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { TreeNode } from '~/composables/useProjectTree'

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')
const toggleTheme = () => {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}

const props = defineProps<{
  globalNodes?: TreeNode[]
  contextNodes?: TreeNode[]
  isCollapsed: boolean
  width: number // Kept for potential animation usage, though rail usually usually just toggles classes
  activeNodeId?: string
  hasProject: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle'): void
}>()

const expandedState = ref<Record<string, boolean>>({})

const sanitizeTo = (to?: string) => {
  if (!to) return undefined
  if (to.includes('/null') || to.includes('/undefined')) return undefined
  return to
}

const processNodes = (nodes: TreeNode[]) => {
  const items: Array<{ node: TreeNode; depth: number }> = []
  const traverse = (nodes: TreeNode[], depth: number) => {
    nodes.forEach((node) => {
      items.push({ node: { ...node, to: sanitizeTo(node.to) }, depth })
      if (!props.isCollapsed && node.children?.length && expandedState.value[node.id] !== false) {
        traverse(node.children, depth + 1)
      }
    })
  }
  traverse(nodes, 0)
  return items
}

const visibleGlobalNodes = computed(() => processNodes(props.globalNodes || []))
const visibleContextNodes = computed(() => processNodes(props.contextNodes || []))

const toggleNode = (nodeId: string) => {
  expandedState.value[nodeId] = !isExpanded(nodeId)
}

const isExpanded = (nodeId: string) => expandedState.value[nodeId] === true

const ensurePathExpanded = (targetId?: string) => {
  if (!targetId) return
  const path: string[] = []
  const findPath = (nodes: TreeNode[], trail: string[]): boolean => {
    for (const node of nodes) {
      const nextTrail = [...trail, node.id]
      if (node.id === targetId) {
        path.push(...nextTrail)
        return true
      }
      if (node.children?.length && findPath(node.children, nextTrail)) return true
    }
    return false
  }

  if (findPath(props.globalNodes || [], []) || findPath(props.contextNodes || [], [])) {
    path.forEach((id) => (expandedState.value[id] = true))
  }
}

watch(
  () => props.activeNodeId,
  (id) => ensurePathExpanded(id),
  { immediate: true },
)

</script>

<template>
  <aside
    class="sidebar-rail relative flex h-screen flex-col bg-[hsl(var(--card))] border-r border-[hsl(var(--border))] transition-all duration-300 ease-in-out z-40"
    :class="[isCollapsed ? 'w-[80px]' : 'w-[280px]']"
  >
    <!-- Header / Branding -->
    <div
      class="h-16 flex items-center flex-shrink-0 relative group/header"
      :class="isCollapsed ? 'justify-center cursor-pointer' : 'justify-between px-6'"
      @click="isCollapsed ? emit('toggle') : undefined"
    >
      <!-- Logo Container (Collapsed) -->
      <div 
        v-if="isCollapsed"
        class="relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300"
      >
        <!-- Actual Logo (Hidden on hover) -->
        <div class="absolute inset-0 flex items-center justify-center bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] rounded-xl shadow-sm transition-opacity duration-200 group-hover/header:opacity-0">
             <UIcon name="i-heroicons-cube-transparent" class="w-6 h-6" />
        </div>
        
        <!-- Expand Icon (Visible on hover) -->
        <div class="absolute inset-0 flex items-center justify-center bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] rounded-xl opacity-0 group-hover/header:opacity-100 transition-opacity duration-200">
             <UIcon name="i-heroicons-chevron-double-right-20-solid" class="w-6 h-6" />
        </div>
      </div>

      <!-- Expanded State Layout -->
      <template v-else>
         <!-- Logo -->
        <div 
            class="flex items-center justify-center w-8 h-8 rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm"
        >
            <UIcon name="i-heroicons-cube-transparent" class="w-5 h-5" />
        </div>

        <!-- App Name -->
        <div class="flex-1 flex flex-col ml-3 overflow-hidden">
            <span class="text-sm font-bold tracking-wide leading-none text-[hsl(var(--foreground))]">
                TABOOLO
            </span>
            <span class="text-[10px] text-[hsl(var(--muted-foreground))] font-medium leading-none mt-1">
                Enterprise
            </span>
        </div>
        
        <!-- Collapse Button -->
        <button 
            @click.stop="emit('toggle')"
            class="p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))] transition-colors"
        >
             <UIcon name="i-heroicons-chevron-double-left-20-solid" class="w-4 h-4" />
        </button>
      </template>

    </div>

    <!-- Navigation Content -->
    <div class="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin py-4" :class="isCollapsed ? 'px-3' : 'px-4'">
        
        <!-- Loading -->
        <div v-if="loading" class="flex justify-center py-4">
            <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 text-[hsl(var(--muted-foreground))] animate-spin" />
        </div>

        <!-- Sections -->
        <div v-for="(section, idx) in [visibleGlobalNodes, visibleContextNodes]" :key="idx" class="mb-6">
            <!-- Section Separator/Title -->
            <div v-if="section.length && !isCollapsed && idx === 1 && hasProject" class="mb-2 px-3 text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider flex items-center gap-2">
                PROJECT
                <div class="h-px bg-[hsl(var(--border))] flex-1"></div>
            </div>
             <!-- Separator when collapsed -->
            <div v-if="section.length && isCollapsed && idx === 1 && hasProject" class="my-4 mx-2 h-px bg-[hsl(var(--border))]"></div>


            <ul class="space-y-1">
                <li v-for="item in section" :key="item.node.id">
                    <UTooltip 
                        :text="item.node.label" 
                        placement="right" 
                        :prevent="!isCollapsed"
                        :popper="{ placement: 'right', offsetDistance: 16 }"
                    >
                        <NuxtLink
                            v-if="item.node.to"
                            :to="item.node.to"
                            class="group flex items-center gap-3 rounded-xl transition-all duration-200 outline-none select-none relative"
                            :class="[
                                isCollapsed 
                                    ? 'justify-center w-[54px] h-[54px] mx-auto' 
                                    : 'h-10 px-3 w-full',
                                item.node.id === activeNodeId 
                                    ? 'bg-[hsl(var(--primary))/0.1] text-[hsl(var(--primary))] font-semibold' 
                                    : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))/0.5] hover:text-[hsl(var(--foreground))]'
                            ]"
                            :style="(!isCollapsed && item.depth > 0) ? { paddingLeft: `${item.depth * 16 + 12}px` } : {}"
                        >
                            <Icon 
                                v-if="item.node.icon" 
                                :name="item.node.icon" 
                                class="flex-shrink-0 transition-colors duration-200"
                                :class="[
                                    isCollapsed ? 'w-6 h-6' : 'w-5 h-5',
                                    item.node.id === activeNodeId ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))]'
                                ]" 
                            />
                            
                            <span v-if="!isCollapsed" class="flex-1 truncate text-sm">
                                {{ item.node.label }}
                            </span>

                            <!-- Chevron for children (Expanded) -->
                            <div 
                                v-if="!isCollapsed && item.node.children?.length"
                                @click.prevent.stop="toggleNode(item.node.id)"
                                class="p-1 rounded-md hover:bg-[hsl(var(--background))/0.5] transition-colors"
                            >
                                <UIcon 
                                    name="i-heroicons-chevron-right-20-solid" 
                                    class="w-3.5 h-3.5 transition-transform duration-200"
                                    :class="{ 'rotate-90': isExpanded(item.node.id) }" 
                                />
                            </div>
                        </NuxtLink>

                        <!-- Parent Item (No Link) -->
                        <div
                            v-else
                            class="group flex items-center gap-3 rounded-xl transition-all duration-200 cursor-pointer outline-none select-none"
                            :class="[
                                isCollapsed 
                                    ? 'justify-center w-[54px] h-[54px] mx-auto' 
                                    : 'h-10 px-3 w-full',
                                item.node.id === activeNodeId 
                                    ? 'bg-[hsl(var(--primary))/0.1] text-[hsl(var(--primary))] font-semibold' 
                                    : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))/0.5] hover:text-[hsl(var(--foreground))]'
                            ]"
                             :style="(!isCollapsed && item.depth > 0) ? { paddingLeft: `${item.depth * 16 + 12}px` } : {}"
                             @click="item.node.children?.length ? toggleNode(item.node.id) : undefined"
                        >
                             <Icon 
                                v-if="item.node.icon" 
                                :name="item.node.icon" 
                                class="flex-shrink-0 transition-colors duration-200"
                                :class="[
                                    isCollapsed ? 'w-6 h-6' : 'w-5 h-5',
                                    item.node.id === activeNodeId ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))]'
                                ]" 
                            />
                            <span v-if="!isCollapsed" class="flex-1 truncate text-sm">
                                {{ item.node.label }}
                            </span>
                             <div 
                                v-if="!isCollapsed && item.node.children?.length"
                                class="p-1"
                            >
                                <UIcon 
                                    name="i-heroicons-chevron-right-20-solid" 
                                    class="w-3.5 h-3.5 transition-transform duration-200"
                                    :class="{ 'rotate-90': isExpanded(item.node.id) }" 
                                />
                            </div>
                        </div>
                    </UTooltip>
                </li>
            </ul>
        </div>

        <!-- No Project State -->
        <div v-if="!hasProject && !loading && !visibleContextNodes.length && !isCollapsed" class="mt-8 px-4 text-center">
             <div class="w-12 h-12 mx-auto rounded-full bg-[hsl(var(--muted)/0.5)] flex items-center justify-center mb-3">
                 <UIcon name="i-heroicons-folder-open" class="w-6 h-6 text-[hsl(var(--muted-foreground))]" />
             </div>
             <p class="text-xs text-[hsl(var(--muted-foreground))] mb-3">No project selected</p>
             <UButton to="/projects" color="neutral" variant="soft" size="xs" block>Select Project</UButton>
        </div>

    </div>

    <!-- Footer: Theme Toggle -->
    <div 
      class="flex-shrink-0 border-t border-[hsl(var(--border))] transition-all duration-300"
      :class="isCollapsed ? 'p-3' : 'p-4'"
    >
      <UTooltip 
        :text="isDark ? 'Light Mode' : 'Dark Mode'" 
        placement="right" 
        :prevent="!isCollapsed"
      >
        <button
          @click="toggleTheme"
          class="flex items-center gap-3 w-full rounded-xl transition-all duration-200 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))/0.5] hover:text-[hsl(var(--foreground))]"
          :class="isCollapsed ? 'justify-center w-[54px] h-[54px] mx-auto' : 'h-10 px-3'"
        >
          <Icon 
            :name="isDark ? 'heroicons:sun' : 'heroicons:moon'" 
            class="flex-shrink-0 transition-colors duration-200"
            :class="isCollapsed ? 'w-6 h-6' : 'w-5 h-5'"
          />
          <span v-if="!isCollapsed" class="text-sm">
            {{ isDark ? 'Light Mode' : 'Dark Mode' }}
          </span>
        </button>
      </UTooltip>
    </div>
    
  </aside>
</template>

<style scoped>
.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--border)) transparent;
}
.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: hsl(var(--border));
  border-radius: 4px;
}
</style>
