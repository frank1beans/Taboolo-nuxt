import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'

export default defineNuxtPlugin(() => {
  // Register all community features once on client
  ModuleRegistry.registerModules([AllCommunityModule])
})
