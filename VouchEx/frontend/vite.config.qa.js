import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/** QA builds go to laravel-api-testing/public — never touches production laravel-api/public */
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: path.resolve(__dirname, '../laravel-api-testing/public'),
    emptyOutDir: false,
  },
  server: {
    port: 5174,
    proxy: {
      '/api': { target: 'https://vouchex.kuhu.org.in', changeOrigin: true, secure: true },
      '/config.json': { target: 'https://vouchex.kuhu.org.in', changeOrigin: true, secure: true },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': { target: 'https://vouchex.kuhu.org.in', changeOrigin: true, secure: true },
      '/config.json': { target: 'https://vouchex.kuhu.org.in', changeOrigin: true, secure: true },
    },
  },
})
