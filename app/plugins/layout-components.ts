import { defineNuxtPlugin } from '#app'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppHeader from '@/components/layout/AppHeader.vue'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('AppSidebar', AppSidebar)
  nuxtApp.vueApp.component('AppHeader', AppHeader)
})
