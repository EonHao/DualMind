import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
    // Add proxy configuration to solve CORS issues
    proxy: {
      // Proxy /api requests to the backend server
      '/api': {
        target: 'http://127.0.0.1:8000', // Explicitly use IPv4 address
        changeOrigin: true, // Needed for virtual hosted sites
        secure: false, // Set to false if it's https
      },
    },
  },
  build: {
    outDir: 'build',
    sourcemap: true,
  },
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
  },
})
