import { defineNuxtConfig } from "nuxt/config";
import { fileURLToPath, URL } from "node:url";

const rootDir = fileURLToPath(new URL("./", import.meta.url));
const assetsDir = fileURLToPath(new URL("./assets", import.meta.url));
const mainCssPath = fileURLToPath(new URL("./assets/css/main.css", import.meta.url));

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",

  devtools: { enabled: true },

  modules: [
    "@nuxtjs/tailwindcss",
    "@nuxt/eslint",
    "@nuxtjs/i18n",
  ],

  // i18n configuration
  i18n: {
    defaultLocale: "en",
    locales: [
      { code: "en", name: "English" },
      { code: "it", name: "Italiano" },
    ],
  },

  css: [mainCssPath],

  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },

  vite: {
    resolve: {
      alias: {
        "~": rootDir,
        "@": rootDir,
        assets: assetsDir,
        "@assets": assetsDir,
        "~/assets": assetsDir,
      },
    },
  },

  srcDir: ".",
  pages: true,
  dir: {
    pages: "pages",
  },

  runtimeConfig: {
    // Base URL del backend Python (FastAPI). Es: http://localhost:8000/api/v1
    pythonApiBaseUrl: process.env.PYTHON_API_BASE_URL || "http://localhost:8000/api/v1",
  },
});
