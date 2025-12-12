import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import { defineNuxtPlugin } from '#app';

export default defineNuxtPlugin(() => {
  // Register all community features once on client
  ModuleRegistry.registerModules([AllCommunityModule])
})
