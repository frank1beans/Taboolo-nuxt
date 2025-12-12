import { defineAppConfig } from 'nuxt/schema'

export default defineAppConfig({
  ui: {
    strategy: 'override',
    primary: 'primary',
    gray: 'slate',
    typography: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontWeight: {
        body: '400',
        heading: '600',
      },
    },
  },
});
