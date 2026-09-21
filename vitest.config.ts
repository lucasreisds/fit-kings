import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@dominio': fileURLToPath(new URL('./src/domain', import.meta.url)),
      '@dados': fileURLToPath(new URL('./src/dados', import.meta.url)),
      '@plataforma': fileURLToPath(new URL('./src/plataforma', import.meta.url)),
      '@ui': fileURLToPath(new URL('./src/ui', import.meta.url)),
      '@funcionalidades': fileURLToPath(new URL('./src/funcionalidades', import.meta.url)),
      '@app': fileURLToPath(new URL('./src/app', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unidade/**/*.test.{ts,tsx}', 'tests/integracao/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**', 'src/dados/**'],
    },
  },
})
