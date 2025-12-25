import { defineNuxtPlugin } from '#app'
import AppHeader from '@/components/layout/AppHeader.vue'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('AppHeader', AppHeader)
})
