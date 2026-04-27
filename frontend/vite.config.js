import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // 强制所有依赖（包括 react-globe.gl）共享同一个 React 实例
    // 解决 React 19 dispatcher 冲突导致的 useRef/useState 为 null 问题
    alias: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5180,
    proxy: {
      '/api': 'http://localhost:8000',
      '/ws':  { target: 'ws://localhost:8000', ws: true },
    },
  },
})
