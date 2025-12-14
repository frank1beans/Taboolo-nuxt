import { defineNuxtConfig } from 'nuxt/config';
import { fileURLToPath } from 'node:url';

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  builder: '@nuxt/vite-builder',

  srcDir: 'app/',

  modules: [
    '@nuxt/ui',
    '@nuxt/icon',
    '@nuxtjs/color-mode',
    '@pinia/nuxt',
  ],

  components: {
    dirs: [
      {
        path: '~/components',
        pathPrefix: false,
      },
    ],
  },

  css: ['~/assets/css/main.css'],

  postcss: {
    plugins: {
      '@tailwindcss/postcss': {},
      autoprefixer: {},
    },
  },

  colorMode: {
    preference: 'system',
    fallback: 'light',
    classSuffix: '',
  },

  alias: {
    '@': fileURLToPath(new URL('./app', import.meta.url)),
  },

  nitro: {
    alias: {
      '#models': fileURLToPath(new URL('./server/models', import.meta.url)),
      '#utils': fileURLToPath(new URL('./server/utils', import.meta.url)),
      '#importers': fileURLToPath(new URL('./server/importers', import.meta.url)),
      '#services': fileURLToPath(new URL('./server/services', import.meta.url)),
    },
    imports: {
      dirs: ['./server/models', './server/utils', './server/importers']
    }
  },

  runtimeConfig: {
    public: {
      apiBaseUrl: '',
    },
    mongodbUri: process.env.MONGODB_URI || '',
  },
});
