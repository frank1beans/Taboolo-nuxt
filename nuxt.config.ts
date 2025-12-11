import { defineNuxtConfig } from "nuxt/config";
import { fileURLToPath } from 'node:url';

export default defineNuxtConfig({
  future: {
    compatibilityVersion: 4,
  },

  compatibilityDate: "2025-07-15",
  ssr: true,
  devtools: { enabled: true },

  modules: [
    "@nuxt/ui",
    "@nuxt/icon",
    "@nuxtjs/color-mode",
    "@nuxtjs/i18n",
    "@nuxt/eslint",
  ],

  css: ["~/assets/css/main.css"],

  nitro: {
    alias: {
      '#models': fileURLToPath(new URL('./server/models', import.meta.url)),
      '#utils': fileURLToPath(new URL('./server/utils', import.meta.url)),
      '#importers': fileURLToPath(new URL('./server/importers', import.meta.url)),
    },
  },

  postcss: {
    plugins: {
      "tailwindcss": false,
      "tailwindcss/nesting": false,
      "@tailwindcss/postcss": {},
      autoprefixer: {},
    },
  },

  colorMode: {
    preference: "system",
    fallback: "light",
    classSuffix: "",
  },

  i18n: {
    defaultLocale: "en",
    locales: [
      { code: "en", name: "English" },
      { code: "it", name: "Italiano" },
    ],
  },

  runtimeConfig: {
    apiBaseUrl: process.env.API_BASE_URL || process.env.PYTHON_API_BASE_URL || "/api",
    pythonApiBaseUrl: process.env.PYTHON_API_BASE_URL || "/api",
    mongodbUri: process.env.MONGODB_URI || "",
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || "/api",
      pythonApiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || "/api",
    },
  },

  imports: {
    dirs: [
      'composables',
      'composables/**',
      'lib',
      'lib/**',
      'utils',
      'utils/**',
    ],
  },

  components: [
    {
      path: '~/components',
      pathPrefix: false,
    },
    {
      path: '~/components',
      pattern: '**/*.vue',
    },
  ],
});
