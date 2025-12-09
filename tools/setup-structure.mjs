// tools/setup-structure.mjs
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = process.cwd()

function log(msg) {
  console.log(msg)
}

function ensureDir(relPath) {
  const full = join(root, relPath)
  if (!existsSync(full)) {
    mkdirSync(full, { recursive: true })
    log(`Created dir: ${relPath}`)
  } else {
    log(`Dir exists:   ${relPath}`)
  }
}

function ensureFile(relPath, content) {
  const full = join(root, relPath)
  if (existsSync(full)) {
    log(`File exists, skip: ${relPath}`)
    return
  }
  const dir = dirname(full)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
    log(`Created dir (for file): ${relPath}`)
  }
  writeFileSync(full, content, 'utf8')
  log(`Created file: ${relPath}`)
}

// ----------------------
// 1. Directory structure
// ----------------------

const dirs = [
  // Pages
  'pages',
  'pages/auth',
  'pages/home',
  'pages/projects',
  'pages/projects/[id]',
  'pages/projects/[id]/analysis',
  'pages/projects/[id]/estimate',
  'pages/projects/[id]/pricing',
  'pages/projects/[id]/settings',
  'pages/import',
  'pages/lab',
  'pages/price-catalog',
  'pages/profile',
  'pages/settings',
  'pages/errors',

  // Components
  'components/layout',
  'components/project',
  'components/wbs',
  'components/analysis',
  'components/analysis/charts',
  'components/comparison',
  'components/folder-explorer',
  'components/ui',

  // Composables
  'composables',
  'composables/queries',

  // Stores
  'stores',

  // Plugins
  'plugins',

  // Server libs
  'server',
  'server/lib',
  'server/lib/supabase',

  // Assets
  'assets',
  'assets/css',

  // Features (domain-level, opzionale)
  'features',
  'features/project',
  'features/analysis',
  'features/comparison',
  'features/wbs',
  'features/auth',

  // Types
  'types'
]

dirs.forEach(ensureDir)

// ----------------------
// 2. File structure
// ----------------------

const vuePage = (title) => `
<template>
  <div class="page-wrapper">
    <h1>${title}</h1>
  </div>
</template>

<script setup lang="ts">
// TODO: implement ${title} page
</script>
`.trimStart()

const vueLayout = (name) => `
<template>
  <div class="layout-${name.toLowerCase()}">
    <header>
      <!-- TODO: add header / navigation -->
    </header>
    <main>
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
// TODO: implement ${name} layout logic if needed
</script>
`.trimStart()

const vueComponent = (name) => `
<template>
  <div class="${name}-component">
    <!-- TODO: ${name} component -->
  </div>
</template>

<script setup lang="ts">
// TODO: implement ${name} component
</script>
`.trimStart()

const tsComposable = (name, body = '') => `
export function ${name}() {
  ${body || '// TODO: implement composable logic'}
}
`.trimStart()

const tsStore = (name) => `
import { defineStore } from 'pinia'

export const use${name}Store = defineStore('${name.toLowerCase()}', {
  state: () => ({
    // TODO: define ${name} store state
  }),
  actions: {
    // TODO: define ${name} actions
  }
})
`.trimStart()

const pluginTemplate = (name) => `
import { defineNuxtPlugin } from '#app'

export default defineNuxtPlugin((nuxtApp) => {
  // TODO: setup ${name} plugin
})
`.trimStart()

const files = [
  // ---------- PAGES ----------
  ['pages/index.vue', vuePage('Home')],
  ['pages/home/index.vue', vuePage('Home')],
  ['pages/auth/login.vue', vuePage('Login')],
  ['pages/auth/register.vue', vuePage('Register')],

  // Projects
  ['pages/projects/index.vue', vuePage('Projects List')],
  ['pages/projects/[id]/index.vue', vuePage('Project Detail')],
  ['pages/projects/[id]/analysis/index.vue', vuePage('Project Analysis')],
  ['pages/projects/[id]/analysis/advanced-analysis.vue', vuePage('Advanced Analysis')],
  ['pages/projects/[id]/analysis/batch-returns.vue', vuePage('Batch Returns')],
  ['pages/projects/[id]/estimate/index.vue', vuePage('Project Estimate')],
  ['pages/projects/[id]/estimate/estimate.vue', vuePage('Estimate')],
  ['pages/projects/[id]/estimate/estimate-new.vue', vuePage('New Estimate')],
  ['pages/projects/[id]/pricing/price-list.vue', vuePage('Price List')],
  ['pages/projects/[id]/settings/index.vue', vuePage('Project Settings')],
  ['pages/projects/[id]/settings/wbs.vue', vuePage('Project WBS Settings')],

  // Other main pages
  ['pages/import/unified-import.vue', vuePage('Unified Import')],
  ['pages/lab/charts-test.vue', vuePage('Charts Test')],
  ['pages/price-catalog/explorer.vue', vuePage('Price Catalog Explorer')],
  ['pages/profile/index.vue', vuePage('Profile')],
  ['pages/settings/index.vue', vuePage('Settings')],
  ['pages/errors/404.vue', vuePage('Not Found')],

  // ---------- LAYOUTS ----------
  ['layouts/default.vue', vueLayout('Default')],
  ['layouts/auth.vue', vueLayout('Auth')],
  ['layouts/project.vue', vueLayout('Project')],

  // ---------- COMPONENTS: layout ----------
  ['components/layout/AppSidebar.vue', vueComponent('app-sidebar')],
  ['components/layout/PageShell.vue', vueComponent('page-shell')],
  ['components/layout/TopBar.vue', vueComponent('top-bar')],

  // ---------- COMPONENTS: project ----------
  ['components/project/ProjectPageHeader.vue', vueComponent('project-page-header')],
  ['components/project/ProjectSummaryStrip.vue', vueComponent('project-summary-strip')],
  ['components/project/ProjectTabs.vue', vueComponent('project-tabs')],
  ['components/project/ProjectListCard.vue', vueComponent('project-list-card')],
  ['components/project/EditProjectDialog.vue', vueComponent('edit-project-dialog')],
  ['components/project/NewProjectDialog.vue', vueComponent('new-project-dialog')],
  ['components/project/RecentActivityCard.vue', vueComponent('recent-activity-card')],
  ['components/project/QuickActionsCard.vue', vueComponent('quick-actions-card')],

  // ---------- COMPONENTS: WBS ----------
  ['components/wbs/WbsTree.vue', vueComponent('wbs-tree')],
  ['components/wbs/WbsPreviewTree.vue', vueComponent('wbs-preview-tree')],
  ['components/wbs/WbsSidebar.vue', vueComponent('wbs-sidebar')],
  ['components/wbs/WbsVisibilitySection.vue', vueComponent('wbs-visibility-section')],

  // ---------- COMPONENTS: analysis ----------
  ['components/analysis/AnalysisCharts.vue', vueComponent('analysis-charts')],
  ['components/analysis/charts/CryptoStyleChart.vue', vueComponent('crypto-style-chart')],
  ['components/analysis/charts/GlassCard.vue', vueComponent('glass-card')],
  ['components/analysis/charts/HeatmapCompetitiveness.vue', vueComponent('heatmap-competitiveness')],
  ['components/analysis/charts/OverlayBarChart.vue', vueComponent('overlay-bar-chart')],
  ['components/analysis/charts/TrendEvolution.vue', vueComponent('trend-evolution')],
  ['components/analysis/charts/WaterfallCompositionDelta.vue', vueComponent('waterfall-composition-delta')],

  // ---------- COMPONENTS: comparison ----------
  ['components/comparison/ComparisonGrid.vue', vueComponent('comparison-grid')],
  ['components/comparison/ComparisonOffers.vue', vueComponent('comparison-offers')],

  // ---------- COMPONENTS: folder explorer ----------
  ['components/folder-explorer/ExplorerBreadcrumb.vue', vueComponent('explorer-breadcrumb')],
  ['components/folder-explorer/ExplorerSidebar.vue', vueComponent('explorer-sidebar')],
  ['components/folder-explorer/FolderGrid.vue', vueComponent('folder-grid')],
  ['components/folder-explorer/FolderTile.vue', vueComponent('folder-tile')],

  // ---------- COMPOSABLES ----------
  ['composables/useMobile.ts', tsComposable('useMobile')],
  ['composables/useToast.ts', tsComposable('useToast')],
  ['composables/useAnalysisData.ts', tsComposable('useAnalysisData')],
  ['composables/useProjectContext.ts', tsComposable('useProjectContext')],
  ['composables/useDashboardStats.ts', tsComposable('useDashboardStats')],
  ['composables/useHeatmapData.ts', tsComposable('useHeatmapData')],
  ['composables/useTrendEvolutionData.ts', tsComposable('useTrendEvolutionData')],
  ['composables/queries/useProjectQueries.ts', tsComposable('useProjectQueries')],
  ['composables/queries/usePriceCatalog.ts', tsComposable('usePriceCatalog')],
  ['composables/queries/usePropertySchemas.ts', tsComposable('usePropertySchemas')],
  ['composables/queries/useWbsQueries.ts', tsComposable('useWbsQueries')],

  // ---------- STORES ----------
  ['stores/auth.ts', tsStore('Auth')],
  ['stores/project.ts', tsStore('Project')],
  ['stores/ui.ts', tsStore('Ui')],

  // ---------- PLUGINS ----------
  ['plugins/pinia.client.ts', `
import { defineNuxtPlugin } from '#app'
import { createPinia } from 'pinia'

export default defineNuxtPlugin((nuxtApp) => {
  const pinia = createPinia()
  nuxtApp.vueApp.use(pinia)
})
`.trimStart()],

  ['plugins/api-client.ts', pluginTemplate('API client')],
  ['plugins/supabase.client.ts', pluginTemplate('Supabase client')],
  ['plugins/appwrite.client.ts', pluginTemplate('Appwrite client')],

  // ---------- SERVER LIBS ----------
  ['server/lib/supabase/client.ts', `// TODO: port Supabase client from React project
`.trimStart()],
  ['server/lib/supabase/types.ts', `// TODO: port Supabase types from React project
`.trimStart()],

  // ---------- ASSETS / CSS ----------
  ['assets/css/index.css', `/* TODO: import global styles from old index.css */\n`],
  ['assets/css/ag-grid-custom.css', `/* TODO: port ag-grid-custom.css */\n`],
  ['assets/css/ag-grid-overrides.css', `/* TODO: port ag-grid-overrides.css */\n`],

  // ---------- TYPES ----------
  ['types/api.ts', `// TODO: port API types from old project\n`],
  ['types/exceljs.d.ts', `// TODO: port exceljs types from old project\n`]
]

files.forEach(([path, content]) => ensureFile(path, content))

log('✅ Structure setup completed.')
