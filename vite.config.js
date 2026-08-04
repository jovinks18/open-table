import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        apply: resolve(import.meta.dirname, 'apply.html'),
        safety: resolve(import.meta.dirname, 'safety.html'),
        faq: resolve(import.meta.dirname, 'faq.html'),
      },
    },
  },
})
