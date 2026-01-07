<script setup lang="ts">
import { computed } from 'vue'
import { useCurrentContext } from '~/composables/useCurrentContext'

type BreadcrumbItem = {
  label: string
  to: string
  icon?: string
  implicit?: boolean
}

const props = withDefaults(defineProps<{
  currentLabel?: string
  variant?: 'default' | 'title'
  rootMode?: 'text' | 'icon' | 'hidden'
}>(), {
  currentLabel: undefined,
  variant: 'default',
  rootMode: 'text'
})

const route = useRoute()
const { currentProject, currentEstimate } = useCurrentContext()

// Italian labels for route segments
const routeMeta: Record<string, { label: string; icon?: string; implicit?: boolean }> = {
  home: { label: 'Home', icon: 'heroicons:home', implicit: true },
  projects: { label: 'Progetti', icon: 'heroicons:folder', implicit: true },
  catalogs: { label: 'Listini' },
  analytics: { label: 'Analytics' },
  comparison: { label: 'Confronto Offerte' },
  conflicts: { label: 'Conflitti' },
  detail: { label: 'Dettaglio' },
  estimate: { label: 'Preventivo' },
  import: { label: 'Importazione Dati' },
  offer: { label: 'Offerta' },
  pricelist: { label: 'Listino' },
  offers: { label: 'Offerte' },
  settings: { label: 'Impostazioni' },
  visualizer: { label: 'Mappa Semantica' },
  'price-estimator': { label: 'Stima Prezzi' },
}

const getRouteMeta = (segment: string) => routeMeta[segment.toLowerCase()]

const getRouteLabel = (segment: string): string => {
  return getRouteMeta(segment)?.label || segment.charAt(0).toUpperCase() + segment.slice(1)
}

const buildCrumb = (segment: string, to: string, overrides?: Partial<BreadcrumbItem>): BreadcrumbItem => {
  const meta = getRouteMeta(segment)
  return {
    label: meta?.label ?? segment.charAt(0).toUpperCase() + segment.slice(1),
    to,
    icon: meta?.icon,
    implicit: meta?.implicit,
    ...overrides,
  }
}

const crumbs = computed(() => {
  const overrideLabel = props.currentLabel?.trim()
  const metaBreadcrumb = route.meta?.breadcrumb as string | undefined
  const explicitLabel = overrideLabel || metaBreadcrumb
  const leafSegments = new Set(['comparison', 'detail', 'import', 'offer', 'visualizer'])
  
  const pathSegments = route.path.split('/').filter(Boolean)
  
  // Build breadcrumb based on path segments
  // Skip dynamic segments like IDs (they're handled by context)
  
  // Helper to check if a string looks like an ID (UUID or numeric)
  const isIdLike = (s: string): boolean => {
    return /^[0-9a-f-]{8,}$/i.test(s) || /^\d+$/.test(s)
  }

  const normalizeQueryValue = (value: unknown): string | null => {
    if (typeof value === 'string') return value
    if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : null
    return null
  }

  const offerId = normalizeQueryValue(route.query.offerId)
  const offerRound = normalizeQueryValue(route.query.round)
  const offerCompany = normalizeQueryValue(route.query.company)
  const deltaPerc = normalizeQueryValue(route.query.deltaPerc)
  const deltaAmount = normalizeQueryValue(route.query.deltaAmount)
  const isOfferContext = Boolean(offerId || (offerRound && offerCompany))

  const resolveCompanyLabel = () => {
    if (!offerCompany) return null
    const decoded = decodeURIComponent(offerCompany)
    const companies = currentEstimate.value?.companies ?? []
    const match = companies.find((company) =>
      String(company.id) === decoded || company.name === decoded
    )
    return match?.name || decoded
  }

  const resolveRoundLabel = () => {
    if (!offerRound) return null
    const rounds = currentEstimate.value?.rounds ?? []
    const match = rounds.find((round) =>
      String(round.id) === offerRound || round.name === offerRound
    )
    if (match?.name) return match.name
    if (/^\d+$/.test(offerRound)) return `R${offerRound}`
    return offerRound
  }

  const formatSigned = (value: number, formatter: Intl.NumberFormat) => {
    const sign = value > 0 ? '+' : value < 0 ? '-' : ''
    return `${sign}${formatter.format(Math.abs(value))}`
  }

  const resolveDeltaLabel = () => {
    if (deltaPerc) {
      const parsed = Number(deltaPerc)
      if (!Number.isNaN(parsed)) {
        const percentFormatter = new Intl.NumberFormat('it-IT', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })
        return `${formatSigned(parsed, percentFormatter)}%`
      }
      return `${deltaPerc}%`
    }
    if (deltaAmount) {
      const parsed = Number(deltaAmount)
      if (!Number.isNaN(parsed)) {
        const amountFormatter = new Intl.NumberFormat('it-IT', {
          style: 'currency',
          currency: 'EUR',
          maximumFractionDigits: 0,
        })
        return formatSigned(parsed, amountFormatter)
      }
      return deltaAmount
    }
    return null
  }

  const buildOfferLabel = () => {
    if (!isOfferContext) return null
    const parts: string[] = []
    const companyLabel = resolveCompanyLabel()
    const roundLabel = resolveRoundLabel()
    if (companyLabel) parts.push(companyLabel)
    if (roundLabel) parts.push(roundLabel)
    const deltaLabel = resolveDeltaLabel()
    if (deltaLabel) parts.push(`Delta ${deltaLabel}`)
    const suffix = parts.length ? `: ${parts.join(', ')}` : ''
    return `Offerta${suffix}`
  }

  const buildListinoLabel = () => {
    const offerLabel = buildOfferLabel()
    if (offerLabel) return `Listino (${offerLabel})`
    return 'Listino (Baseline)'
  }

  const isProjectRoot = pathSegments.length === 2
    && pathSegments[0] === 'projects'
    && isIdLike(pathSegments[1] || '')
  const isEstimateRoot = pathSegments.length === 4
    && pathSegments[0] === 'projects'
    && isIdLike(pathSegments[1] || '')
    && pathSegments[2] === 'estimate'
    && isIdLike(pathSegments[3] || '')
  const isPricelistRoot = pathSegments.length === 3
    && pathSegments[0] === 'projects'
    && isIdLike(pathSegments[1] || '')
    && pathSegments[2] === 'pricelist'
  const isOfferRoot = pathSegments.length === 5
    && pathSegments[0] === 'projects'
    && isIdLike(pathSegments[1] || '')
    && pathSegments[2] === 'estimate'
    && isIdLike(pathSegments[3] || '')
    && pathSegments[4] === 'offer'
  const suppressExplicitLabel = isProjectRoot || isEstimateRoot || isPricelistRoot || isOfferRoot
  const skipLeafSegments = explicitLabel && !suppressExplicitLabel

  let items: BreadcrumbItem[] = [
    buildCrumb('home', '/'),
  ]

  let currentPath = ''
  
  for (let i = 0; i < pathSegments.length; i++) {
    const segment = pathSegments[i]!
    currentPath += `/${segment}`
    
    // Skip ID segments (e.g., UUIDs or numeric IDs)
    if (isIdLike(segment)) {
      // This is a project/estimate ID, use context instead
      continue
    }

    if (skipLeafSegments && leafSegments.has(segment)) {
      continue
    }
    
    // Check if the NEXT segment is an ID (meaning this segment relates to a specific item)
    const nextSegment = pathSegments[i + 1]
    const nextIsId = nextSegment ? isIdLike(nextSegment) : false
    
    if (segment === 'projects') {
      items.push(buildCrumb(segment, '/projects'))
      
      // If we have a current project, add it
      if (currentProject.value && nextIsId) {
        items.push({ 
          label: currentProject.value.name, 
          to: `/projects/${currentProject.value.id}` 
        })
      }
    } else if (segment === 'estimate') {
      if (currentEstimate.value?.id) {
        items.push({
          label: currentEstimate.value.name,
          to: `/projects/${currentProject.value?.id ?? ''}/estimate/${currentEstimate.value.id}`,
        })
      }
    } else if (segment === 'pricelist') {
      if (currentEstimate.value?.id) {
        items.push({
          label: currentEstimate.value.name,
          to: `/projects/${currentProject.value?.id ?? ''}/estimate/${currentEstimate.value.id}`,
        })
      }
      items.push({
        label: buildListinoLabel(),
        to: route.fullPath || currentPath,
      })
    } else if (segment === 'offer') {
      items.push({
        label: buildOfferLabel() || getRouteLabel(segment),
        to: currentPath,
      })
    } else if (!['index'].includes(segment)) {
      // Add other route segments with Italian labels
      items.push({ label: getRouteLabel(segment), to: currentPath })
    }
  }

  // Add custom breadcrumb from route meta if it's different from the last item
  if (!suppressExplicitLabel && explicitLabel && items[items.length - 1]?.label !== explicitLabel) {
    items.push({ label: explicitLabel, to: '' })
  }

  if (props.rootMode === 'hidden') {
    const last = items.length - 1
    items = items.filter((item, index) => !(item.implicit && index !== last))
  }

  return items
})

const lastIndex = computed(() => crumbs.value.length - 1)
const isTitleVariant = computed(() => props.variant === 'title')

const shouldShowLabel = (item: BreadcrumbItem, isLast: boolean) => {
  return !(props.rootMode === 'icon' && item.implicit && !isLast)
}

const shouldShowIcon = (item: BreadcrumbItem) => {
  return props.rootMode === 'icon' && Boolean(item.icon)
}
</script>

<template>
  <div v-if="isTitleVariant" class="flex flex-col min-w-0">
    <!-- Breadcrumb Row (Parents) -->
    <nav v-if="crumbs.length > 1" aria-label="Breadcrumb" class="flex items-center min-w-0 mb-0.5">
      <ol class="flex items-center gap-1.5 min-w-0">
        <template v-for="(crumb, i) in crumbs.slice(0, -1)" :key="crumb.to || `${crumb.label}-${i}`">
          <li class="flex items-center gap-1.5 min-w-0">
            <Icon 
              v-if="i > 0" 
              name="heroicons:chevron-right" 
              class="w-3.5 h-3.5 text-[hsl(var(--muted-foreground)/0.3)] flex-shrink-0" 
            />
            
            <NuxtLink 
              v-if="crumb.to"
              :to="crumb.to"
              class="text-[11px] font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors truncate max-w-[150px] sm:max-w-[200px]"
            >
              <span v-if="shouldShowIcon(crumb) && crumb.icon" class="flex items-center gap-1">
                <Icon :name="crumb.icon" class="w-3.5 h-3.5" />
                <span v-if="shouldShowLabel(crumb, false)">{{ crumb.label }}</span>
              </span>
              <span v-else>{{ crumb.label }}</span>
            </NuxtLink>
            <span v-else class="text-[11px] font-medium text-[hsl(var(--muted-foreground))] truncate max-w-[150px]">
               {{ crumb.label }}
            </span>
          </li>
        </template>
      </ol>
    </nav>

    <!-- Title Row (Current) -->
    <h1 class="text-xl font-bold text-[hsl(var(--foreground))] truncate leading-tight">
       {{ crumbs[lastIndex]?.label }}
    </h1>
  </div>

  <nav v-else aria-label="Breadcrumb" class="flex items-center min-w-0">
    <ol class="flex items-center gap-1.5 flex-wrap min-w-0">
      <template v-for="(crumb, i) in crumbs" :key="crumb.to || `${crumb.label}-${i}`">
        <li class="flex items-center gap-1.5 min-w-0">
          <!-- Separator -->
          <Icon 
            v-if="i > 0" 
            name="heroicons:chevron-right" 
            class="w-3.5 h-3.5 text-[hsl(var(--muted-foreground)/0.4)] flex-shrink-0" 
          />
          
          <!-- Link -->
          <NuxtLink 
            v-if="crumb.to && i < lastIndex" 
            :to="crumb.to"
            :aria-label="shouldShowLabel(crumb, i === lastIndex) ? undefined : crumb.label"
            :title="shouldShowLabel(crumb, i === lastIndex) ? undefined : crumb.label"
            :class="[
              'transition-colors font-medium flex items-center gap-1.5 min-w-0',
              'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]'
            ]"
          >
            <Icon 
              v-if="shouldShowIcon(crumb) && crumb.icon"
              :name="crumb.icon"
              class="w-4 h-4 text-[hsl(var(--muted-foreground))]"
            />
            <span
              v-if="shouldShowLabel(crumb, i === lastIndex)"
              class="truncate max-w-[150px] sm:max-w-[200px]"
            >
              {{ crumb.label }}
            </span>
            <span v-else class="sr-only">{{ crumb.label }}</span>
          </NuxtLink>

          <!-- Current Page -->
          <div 
            v-else 
            class="flex items-center gap-1.5 min-w-0"
            aria-current="page"
          >
            <Icon 
              v-if="shouldShowIcon(crumb) && crumb.icon"
              :name="crumb.icon"
              class="w-4 h-4 text-[hsl(var(--muted-foreground))]"
            />
            <span
              class="font-semibold text-[hsl(var(--foreground))] truncate min-w-0 max-w-[200px] sm:max-w-xs"
            >
              {{ crumb.label }}
            </span>
          </div>
        </li>
      </template>
    </ol>
  </nav>
</template>
