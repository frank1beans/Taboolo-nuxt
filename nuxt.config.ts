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
    "@nuxt/eslint",
    "@nuxtjs/i18n",
    "@nuxt/ui",
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

  components: [
    {
      path: "~/components",
      pathPrefix: false,
    },
  ],

  runtimeConfig: {
    // Base URL del backend (Nitro/Mongo). Default sullo stesso host /api
    pythonApiBaseUrl: process.env.PYTHON_API_BASE_URL || "/api",
    mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/taboolo",
    public: {
      pythonApiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || "/api",
    },
  },
});
