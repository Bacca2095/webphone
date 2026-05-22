import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/webphone.ce.ts', import.meta.url)),
      name: 'WebPhone',
      formats: ['es', 'iife'],
      fileName: (format) => `webphone.${format}.js`,
    },
    rollupOptions: {
      external: [],
      onwarn(warning, warn) {
        if (warning.code === 'INVALID_ANNOTATION') return
        warn(warning)
      },
    },
    cssCodeSplit: false,
    copyPublicDir: false,
    outDir: 'dist',
    emptyOutDir: false,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
