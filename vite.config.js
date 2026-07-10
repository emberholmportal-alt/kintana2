import { defineConfig } from 'vite'

// base './' => rutas relativas, sirve igual en Render (static site) que en subcarpetas.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1500,
  },
  server: {
    // No vigilar los assets crudos (1.7 GB) ni el build: agotan los file
    // watchers del sistema (ENOSPC) y no cambian durante el desarrollo.
    watch: { ignored: ['**/_assets_raw/**', '**/dist/**'] },
  },
})
