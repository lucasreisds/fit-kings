import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import mkcert from 'vite-plugin-mkcert'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'

const pacote = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8'),
) as { version: string }

// `mode === 'https'` vem de `npm run dev:https`. Sem HTTPS não há validação em
// iPhone: HTTP sobre IP de rede não é contexto seguro, e sem contexto seguro
// não há service worker nem crypto.randomUUID() — o aplicativo recusa operar,
// por decisão D11 / FR-124. Ver quickstart.md.
export default defineConfig(({ mode }) => ({
  define: {
    // Vai para o cabeçalho do arquivo de backup (contrato § Estrutura).
    __VERSAO_DA_APLICACAO__: JSON.stringify(pacote.version),
  },
  plugins: [
    react(),
    ...(mode === 'https' ? [mkcert()] : []),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: false, // servido por public/manifest.webmanifest (T010)
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // FR-057: nenhuma tela depende de rede depois da instalação.
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
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
  server: {
    port: 5173,
    host: mode === 'https',
  },
}))
