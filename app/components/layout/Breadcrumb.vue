<script setup lang="ts">
import { computed } from 'vue'
import { useCurrentContext } from '~/composables/useCurrentContext'

const route = useRoute()
const { currentProject, currentEstimate } = useCurrentContext()

// Italian labels for route segments
const routeLabels: Record<string, string> = {
  'projects': 'Progetti',
  'catalogs': 'Listini',
  'analytics': 'Analytics',
  'conflicts': 'Conflitti',
  'estimate': 'Preventivo',
  'pricelist': 'Listino',
  'offers': 'Offerte',
  'settings': 'Impostazioni',
  'price-estimator': 'Stima Prezzi',
}

const getRouteLabel = (segment: string): string => {
  return routeLabels[segment.toLowerCase()] || segment.charAt(0).toUpperCase() + segment.slice(1)
}

const crumbs = computed(() => {
  const items: Array<{ label: string; to: string }> = [
    { label: 'Home', to: '/' },
  ]
  
  const pathSegments = route.path.split('/').filter(Boolean)
  
  // Build breadcrumb based on path segments
  // Skip dynamic segments like IDs (they're handled by context)
  let currentPath = ''
  
  // Helper to check if a string looks like an ID (UUID or numeric)
  const isIdLike = (s: string): boolean => {
    return /^[0-9a-f-]{8,}$/i.test(s) || /^\d+$/.test(s)
  }
  
  for (let i = 0; i < pathSegments.length; i++) {
    const segment = pathSegments[i]!
    currentPath += `/${segment}`
    
    // Skip ID segments (e.g., UUIDs or numeric IDs)
    if (isIdLike(segment)) {
      // This is a project/estimate ID, use context instead
      continue
    }
    
    // Check if the NEXT segment is an ID (meaning this segment relates to a specific item)
    const nextSegment = pathSegments[i + 1]
    const nextIsId = nextSegment ? isIdLike(nextSegment) : false
    
    if (segment === 'projects') {
      items.push({ label: getRouteLabel(segment), to: '/projects' })
      
      // If we have a current project, add it
      if (currentProject.value && nextIsId) {
        items.push({ 
          label: currentProject.value.name, 
          to: `/projects/${currentProject.value.id}` 
        })
      }
    } else if (segment === 'estimate' && currentEstimate.value?.id) {
      items.push({
        label: currentEstimate.value.name,
        to: `/projects/${currentProject.value?.id ?? ''}/estimate/${currentEstimate.value.id}`,
      })
    } else if (!['index'].includes(segment)) {
      // Add other route segments with Italian labels
      items.push({ label: getRouteLabel(segment), to: currentPath })
    }
  }
  
  // Add custom breadcrumb from route meta if it's different from the last item
  const metaBreadcrumb = route.meta?.breadcrumb as string | undefined
  if (metaBreadcrumb && items[items.length - 1]?.label !== metaBreadcrumb) {
    items.push({ label: metaBreadcrumb, to: '' })
  }

  return items
})
</script>

<template>
  <nav aria-label="Breadcrumb" class="flex items-center text-sm">
    <ol class="flex items-center gap-1.5 flex-wrap">
      <template v-for="(crumb, i) in crumbs" :key="crumb.to || i">
        <li class="flex items-center gap-1.5">
          <!-- Separator -->
          <Icon 
            v-if="i > 0" 
            name="heroicons:chevron-right" 
            class="w-3.5 h-3.5 text-[hsl(var(--muted-foreground)/0.4)] flex-shrink-0" 
          />
          
          <!-- Link -->
          <NuxtLink 
            v-if="crumb.to && i < crumbs.length - 1" 
            :to="crumb.to"
            class="transition-colors hover:text-[hsl(var(--primary))] text-[hsl(var(--muted-foreground))] font-medium truncate max-w-[150px] sm:max-w-[200px]"
          >
            {{ crumb.label }}
          </NuxtLink>

          <!-- Current Page -->
          <span 
            v-else 
            class="font-semibold text-[hsl(var(--foreground))] truncate max-w-[200px] sm:max-w-xs"
            aria-current="page"
          >
            {{ crumb.label }}
          </span>
        </li>
      </template>
    </ol>
  </nav>
</template>
