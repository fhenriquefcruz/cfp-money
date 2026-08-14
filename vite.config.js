import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_PUBLIC_BASE_PATH || '/cfp-money/',

  build: {
    outDir: 'dist',
    sourcemap: false,

    modulePreload: {
      resolveDependencies: (_filename, dependencies, context) => {
        if (context.hostType !== 'html') return dependencies

        return dependencies.filter((dependency) => !dependency.includes('charts-'))
      },
    },

    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'firebase',
              test: /[\\/]node_modules[\\/](?:@firebase|firebase)[\\/]/,
            },
            {
              name: 'charts',
              test: /[\\/]node_modules[\\/]recharts[\\/]/,
            },
            {
              name: 'motion',
              test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
            },
          ],
        },
      },
    },
  },

  test: {
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    globals: true,
    css: true,
  },
})
