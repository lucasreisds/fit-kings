import { defineConfig, devices } from '@playwright/test'

/**
 * Portões 1 a 3 da constituição. O portão 4 é Vitest, sem interface.
 *
 * O motor é o Chromium com as características do iPhone 13 em retrato. O alvo
 * prioritário do produto é o Safari, e a verificação nele é **manual, no
 * aparelho** — T113, T114 e T117. O que esta suíte protege é a regra: gravação
 * durável, imutabilidade do histórico e idempotência da importação não dependem
 * de motor, e rodar em Chromium as mantém verificadas a cada alteração.
 */
const iphone = devices['iPhone 13']

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'mobile-retrato',
      use: {
        ...iphone,
        browserName: 'chromium',
        // Retrato é a única orientação suportada (Restrições de Produto).
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        defaultBrowserType: 'chromium',
      },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
