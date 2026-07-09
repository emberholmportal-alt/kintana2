import { defineConfig } from 'vite'

// base './' => rutas relativas, sirve igual en Render (static site) que en subcarpetas.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1500,
  },
})
