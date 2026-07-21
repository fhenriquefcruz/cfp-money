import { build } from 'vite'
import react from '@vitejs/plugin-react'

await build({
  configFile: false,
  plugins: [react()],
  base: '/cfp-money/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          charts: ['recharts'],
          motion: ['framer-motion'],
        },
      },
    },
  },
})
