import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'
import dts from 'vite-plugin-dts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    ...(process.env.NODE_ENV !== 'production' ? [vueDevTools()] : []),
    dts({
      tsconfigPath: './tsconfig.app.json',
      insertTypesEntry: true,
      exclude: [
        'src/main.ts',
        'src/App.vue',
        'src/core/sip.ts',
        'src/lib/utils.ts',
        'src/components/ui/**',
      ],
    }),
  ],

  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      name: 'VueWebphone',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: ['vue', 'vue-router', 'pinia', '@lucide/vue', 'lucide-vue-next'],
      output: {
        globals: { vue: 'Vue' },
        assetFileNames: 'style.[ext]',
      },
      onwarn(warning, warn) {
        if (warning.code === 'INVALID_ANNOTATION') return
        warn(warning)
      },
    },
    cssCodeSplit: false,
    copyPublicDir: false,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
