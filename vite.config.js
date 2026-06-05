import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/cfp-money/',
  build: {
    outDir: 'dist',
    sourcemap: false,
  }
})
