import { expect, test, type Page } from '@playwright/test'
import { abrirLimpo, concluirTreino, montarTreino, registrarSerie } from './apoio'

/**
 * T011 — FR-194 a FR-201, SC-064 a SC-067.
 *
 * O caso que motivou a feature: no Treino A o supino foi 40 × 10 / 9 / 8. Na
 * próxima vez no Treino A, cada série mostra o que foi feito nela — e não o
 * que foi feito no Treino B, que é mais recente.
 */
const SUPINO = 'Supino reto com barra'
const AGACHAMENTO = 'Agachamento livre'

async function iniciar(pagina: Page, treino: string) {
  await pagina.goto('/#/treinos')
  await pagina.waitForLoadState('networkidle')
  await pagina
    .locator('article', { has: pagina.getByRole('heading', { name: treino, exact: true }) })
    .getByRole('button', { name: 'Iniciar treino' })
    .click()
  await pagina.getByRole('button', { name: 'Confirmar série' }).waitFor()
}

/** O texto **visível** — o elemento também carrega a versão por extenso para leitor de tela. */
const referenciaDaSerieCorrente = (pagina: Page) =>
  pagina.locator('section [data-referencia-anterior] > [aria-hidden="true"]').first()

const referenciaDaRegistrada = (pagina: Page, ordem: number) =>
  pagina.locator(
    `[data-serie-registrada="${ordem}"] [data-referencia-anterior] > [aria-hidden="true"]`,
  )

test.describe('referência da última vez no mesmo treino', () => {
  test.beforeEach(async ({ page }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', [SUPINO])
    await iniciar(page, 'Treino A')
    await registrarSerie(page, { cargaKg: 40, repeticoes: 10 })
    await registrarSerie(page, { cargaKg: 40, repeticoes: 9 })
    await registrarSerie(page, { cargaKg: 40, repeticoes: 8 })
    await concluirTreino(page)

    // O supino feito depois, noutro treino, com outros números.
    await page.goto('/#/treinos')
    await montarTreino(page, 'Treino B', [SUPINO])
    await iniciar(page, 'Treino B')
    await registrarSerie(page, { cargaKg: 30, repeticoes: 12 })
    await concluirTreino(page)
  })

  test('cada série mostra a mesma série da última vez neste treino (SC-064)', async ({ page }) => {
    await iniciar(page, 'Treino A')

    // Série 1: a do Treino A, não a do Treino B (FR-195).
    await expect(referenciaDaSerieCorrente(page)).toHaveText('anterior 40 kg × 10')

    // FR-198, SC-066: nada veio preenchido da referência.
    await expect(page.locator('input[aria-labelledby="rotulo-carga"]')).toHaveValue('')
    await expect(page.locator('input[aria-labelledby="rotulo-reps"]')).toHaveValue('')

    // FR-201: a linha "Última vez" continua olhando qualquer treino.
    await expect(page.getByRole('button', { name: 'Usar 30 kg' })).toBeVisible()

    // SC-067: registrar continua custando os mesmos toques.
    await registrarSerie(page, { cargaKg: 40, repeticoes: 11 })

    // Série 2 mostra a série 2 da última vez, não a 1.
    await expect(referenciaDaSerieCorrente(page)).toHaveText('anterior 40 kg × 9')

    // FR-200: a série registrada guarda a referência ao lado, para comparar.
    await expect(referenciaDaRegistrada(page, 1)).toHaveText('anterior 40 kg × 10')
    await expect(
      page.getByRole('button', { name: 'Corrigir ou remover a série 1' }),
    ).toHaveAccessibleDescription('Na última vez neste treino, série 1: 40 kg × 10.')
  })

  test('série sem correspondente da última vez fica sem referência (FR-197)', async ({ page }) => {
    await iniciar(page, 'Treino A')
    await registrarSerie(page, { cargaKg: 40, repeticoes: 10 })
    await registrarSerie(page, { cargaKg: 40, repeticoes: 10 })
    await registrarSerie(page, { cargaKg: 40, repeticoes: 9 })

    await page.getByRole('button', { name: 'Registrar série a mais' }).click()
    await expect(page.getByText('série extra')).toBeVisible()
    await expect(page.locator('section [data-referencia-anterior]')).toHaveCount(0)
  })

  test('exercício nunca feito neste treino não mostra referência (FR-196)', async ({ page }) => {
    await iniciar(page, 'Treino A')

    await page
      .getByRole('button', { name: /Acrescentar exercício/ })
      .first()
      .click()
    await page.getByLabel('Buscar exercício').fill(AGACHAMENTO)
    await page.waitForTimeout(250)
    await page
      .getByRole('button', { name: new RegExp(AGACHAMENTO) })
      .first()
      .click()
    await page.getByRole('button', { name: 'Confirmar série' }).waitFor()

    await expect(page.getByRole('heading', { name: AGACHAMENTO })).toBeVisible()
    await expect(page.locator('[data-referencia-anterior]')).toHaveCount(0)
  })
})
