<script setup lang="ts">
definePageMeta({
  layout: 'docs',
  title: 'Configuration',
});
</script>

<template>
  <section>
    <h1>Configuration</h1>
    <p>
      Configure your Nuxt 4 application once and share the same foundations across the whole
      product. This page walks through the core configuration files used throughout the Taboolo
      front-end stack.
    </p>

    <h2 id="nuxt-configuration">Nuxt configuration</h2>
    <p>
      The <code>nuxt.config.ts</code> file is the central place to register modules such as Tailwind,
      Nuxt UI, and Color Mode. It also establishes defaults for runtime configuration and global CSS.
    </p>
    <pre>
      <code class="language-ts">
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@nuxt/icon',
    '@nuxtjs/color-mode',
    '@nuxtjs/tailwindcss'
  ],
  css: ['~/assets/css/tailwind.css'],
  colorMode: {
    default: 'light',
    preference: 'system',
    classSuffix: ''
  }
})
      </code>
    </pre>

    <h2 id="runtime-config">Runtime config</h2>
    <p>
      Add secrets and deployment specific information to <code>runtimeConfig</code>. It is strongly
      recommended to expose only the values required on the client through the
      <code>public</code> key to avoid leaking sensitive data.
    </p>

    <h2 id="app-configuration">App configuration</h2>
    <p>
      Use <code>app.config.ts</code> to synchronise Nuxt UI tokens with Tailwind colors and typography.
      Keeping theme definitions in one place ensures documentation, dashboards, and marketing pages
      remain visually aligned.
    </p>
  </section>
</template>
