import { defineNuxtConfig } from 'nuxt/config';
import { fileURLToPath } from 'node:url';

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: process.env.NODE_ENV !== 'production' },

  // Custom Loading Indicator Color (Green)
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    layoutTransition: { name: 'layout', mode: 'out-in' },
  },

  spaLoadingTemplate: false, // Optional: disable default loading template if needed


  srcDir: 'app/',

  modules: [
    '@nuxt/ui',
    '@nuxt/icon',
    '@nuxtjs/color-mode',
    '@pinia/nuxt',
    '@nuxt/eslint',
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
    '#types': fileURLToPath(new URL('./types', import.meta.url)),
  },

  nitro: {
    alias: {
      '#models': fileURLToPath(new URL('./server/models', import.meta.url)),
      '#utils': fileURLToPath(new URL('./server/utils', import.meta.url)),
      '#types': fileURLToPath(new URL('./types', import.meta.url)),
      '#repositories': fileURLToPath(new URL('./server/repositories', import.meta.url)),
      '#services': fileURLToPath(new URL('./server/services', import.meta.url)),
      '#importers': fileURLToPath(new URL('./server/importers', import.meta.url)),
    },
    imports: {
      dirs: ['./server/models', './server/utils', './server/importers']
    }
  },

  typescript: {
    tsConfig: {
      include: ['../types/**/*.d.ts'],
    },
  },

  runtimeConfig: {
    public: {
      apiBaseUrl: '',
    },
    mongodbUri: process.env.MONGODB_URI || '',
    pythonApiBaseUrl: process.env.PYTHON_API_URL || 'http://localhost:8000/api/v1',
    pythonProxyMaxUploadMb: Number(process.env.PYTHON_PROXY_MAX_UPLOAD_MB || 100),
    pythonProxyTimeoutMs: Number(process.env.PYTHON_PROXY_TIMEOUT_MS || 600000),
  },
});
