import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    // Vite 8 / rolldown 需要明确声明条件以兼容 react-map-gl
    conditions: ['module', 'browser', 'import', 'default'],
  },
  optimizeDeps: {
    include: ['maplibre-gl'],
  },
  server: {
    port: 5180,
    proxy: {
      '/api': 'http://localhost:8000',
      '/ws':  { target: 'ws://localhost:8000', ws: true },
    },
  },
})


