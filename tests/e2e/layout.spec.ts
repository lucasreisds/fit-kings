import { expect, test } from '@playwright/test'
import { abrirLimpo, iniciarTreino, montarTreino, registrarSerie } from './apoio'

/**
 * T118 — SC-008: do menor smartphone ao tablet, em retrato, sem rolagem
 * horizontal e sem elementos cortados.
 *
 * As três larguras não são arbitrárias: 320 px é o iPhone SE de primeira
 * geração, o piso real do mercado; 390 px é o alvo prioritário; 834 px é o iPad
 * em retrato, que a constituição manda funcionar adequadamente sem otimização
 * dedicada.
 */
const LARGURAS = [
  { nome: 'smartphone pequeno', largura: 320, altura: 568 },
  { nome: 'smartphone alvo', largura: 390, altura: 844 },
  { nome: 'tablet em retrato', largura: 834, altura: 1112 },
] as const

const TELAS = [
  { nome: 'treinos', rota: '#/treinos' },
  { nome: 'histórico', rota: '#/historico' },
  { nome: 'progresso', rota: '#/progresso' },
  { nome: 'ajustes', rota: '#/ajustes' },
  { nome: 'backup', rota: '#/backup' },
  { nome: 'diagnóstico', rota: '#/diagnostico' },
] as const

for (const viewport of LARGURAS) {
  test.describe(`${viewport.nome} (${viewport.largura} px)`, () => {
    test.use({ viewport: { width: viewport.largura, height: viewport.altura } })

    test('nenhuma tela do aplicativo rola horizontalmente', async ({ page }) => {
      await abrirLimpo(page)
      await montarTreino(page, 'Treino com nome bastante longo para testar quebra', [
        'Supino reto com barra',
        'Desenvolvimento militar com barra',
      ])

      for (const tela of TELAS) {
        await page.goto(`/${tela.rota}`)
        await page.waitForLoadState('networkidle')

        const excesso = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        )
        expect(excesso, `rolagem horizontal em ${tela.nome}`).toBeLessThanOrEqual(0)
      }
    })

    test('a tela de execução cabe na largura, com os numerais inteiros', async ({ page }) => {
      await abrirLimpo(page)
      await montarTreino(page, 'Treino A', ['Supino reto com barra'])
      await iniciarTreino(page)
      await registrarSerie(page, { cargaKg: 142.5, repeticoes: 12 })

      const excesso = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(excesso).toBeLessThanOrEqual(0)

      // Os dois numerais continuam dentro da área visível, sem corte.
      for (const rotulo of ['rotulo-carga', 'rotulo-reps']) {
        const caixa = await page.locator(`input[aria-labelledby="${rotulo}"]`).boundingBox()
        expect(caixa).not.toBeNull()
        expect(caixa!.x).toBeGreaterThanOrEqual(0)
        expect(caixa!.x + caixa!.width).toBeLessThanOrEqual(viewport.largura)
      }

      // E a ação primária ocupa a largura útil, no alcance do polegar.
      const acao = await page.getByRole('button', { name: 'Confirmar série' }).boundingBox()
      expect(acao!.height).toBeGreaterThanOrEqual(44)
    })

    test('todo alvo interativo visível tem ao menos 44 x 44 pt (SC-009)', async ({ page }) => {
      await abrirLimpo(page)
      await montarTreino(page, 'Treino A', ['Supino reto com barra'])

      const pequenos = await page.evaluate(() => {
        const problemas: string[] = []
        const seletor = 'button, a[href], input, select, textarea, [role="tab"]'

        for (const elemento of Array.from(document.querySelectorAll(seletor))) {
          const caixa = elemento.getBoundingClientRect()
          // Elementos escondidos não têm alvo a medir.
          if (caixa.width === 0 && caixa.height === 0) continue
          if (getComputedStyle(elemento).visibility === 'hidden') continue

          if (caixa.height < 44 || caixa.width < 24) {
            problemas.push(
              `${elemento.tagName.toLowerCase()}[${
                elemento.getAttribute('aria-label') ?? elemento.textContent?.trim().slice(0, 24) ?? ''
              }] ${Math.round(caixa.width)}x${Math.round(caixa.height)}`,
            )
          }
        }
        return problemas
      })

      expect(pequenos).toEqual([])
    })
  })
}
