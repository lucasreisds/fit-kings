import { expect, test } from '@playwright/test'
import { abrirLimpo, iniciarTreino, montarTreino, registrarSerie } from './apoio'

/**
 * **Portão 1 da constituição** — recuperação integral das séries confirmadas
 * após encerramento inesperado do aplicativo.
 *
 * Numa PWA, recarregar a página à força é o equivalente fiel ao encerramento
 * abrupto: a memória é descartada por inteiro e só sobrevive o que foi
 * efetivamente gravado. Cobre FR-030 a FR-034, SC-002 e SC-003.
 */
test.describe('Portão 1 — retomada', () => {
  test('recarga forçada no meio da sessão preserva 100% das séries confirmadas (SC-003)', async ({
    page,
  }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', ['Supino reto com barra', 'Crucifixo com halteres'])
    await iniciarTreino(page)

    await registrarSerie(page, { cargaKg: 40, repeticoes: 11 })
    await registrarSerie(page, { repeticoes: 10 })
    await registrarSerie(page, { repeticoes: 9 })

    await expect(page.locator('[data-serie-registrada]')).toHaveCount(3)

    // Encerramento abrupto.
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Recarregar sobre a própria execução cai de volta nela, já retomada.
    await expect(page.getByRole('button', { name: 'Confirmar série' })).toBeVisible()

    // FR-032: a retomada cai no ponto em que parou — o supino está completo,
    // então o ponto é o exercício seguinte.
    await expect(page.getByRole('heading', { name: 'Crucifixo com halteres' })).toBeVisible()
    await expect(page.getByText('Série 1 de 3')).toBeVisible()

    // E as três séries do supino voltam íntegras, com os valores exatos.
    await page.getByRole('tab', { name: /Supino reto com barra/ }).click()
    await expect(page.locator('[data-serie-registrada]')).toHaveCount(3)
    await expect(page.getByText('40 kg × 11')).toBeVisible()
    await expect(page.getByText('40 kg × 10')).toBeVisible()
    await expect(page.getByText('40 kg × 9')).toBeVisible()

    // Aberto por qualquer outra tela, o aplicativo sinaliza a sessão (FR-034).
    await page.goto('/#/treinos')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/está em andamento/)).toBeVisible()
    await expect(page.getByText('3 séries registradas')).toBeVisible()
  })

  test('a sessão retomada continua registrando na sequência correta (FR-032)', async ({ page }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', ['Supino reto com barra'])
    await iniciarTreino(page)

    await registrarSerie(page, { cargaKg: 40, repeticoes: 10 })
    await page.reload()
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Série 2 de 3')).toBeVisible()
    await registrarSerie(page, { repeticoes: 9 })
    await expect(page.locator('[data-serie-registrada]')).toHaveCount(2)
  })

  test('navegar para o histórico e voltar não perde nenhum valor (FR-030, SC-002)', async ({
    page,
  }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', ['Supino reto com barra'])
    await iniciarTreino(page)

    await registrarSerie(page, { cargaKg: 42.5, repeticoes: 11 })

    // Sai da execução, passeia pelo aplicativo e volta.
    await page.getByRole('button', { name: 'Sair' }).click()
    await page.goto('/#/historico')
    await page.waitForLoadState('networkidle')
    await page.goto('/#/ajustes')
    await page.waitForLoadState('networkidle')
    await page.goto('/#/treinos')
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'Retomar' }).click()

    await expect(page.locator('[data-serie-registrada]')).toHaveCount(1)
    await expect(page.getByText('42,5 kg × 11')).toBeVisible()
    // A carga herdada continua no campo, como dado efetivo da série (FR-085).
    await expect(page.locator('input[aria-labelledby="rotulo-carga"]')).toHaveValue('42.5')
  })

  test('impede duas sessões em andamento e leva para a pendente (FR-028)', async ({ page }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', ['Supino reto com barra'])
    await iniciarTreino(page)
    await registrarSerie(page, { cargaKg: 40, repeticoes: 10 })

    await page.getByRole('button', { name: 'Sair' }).click()
    await page.getByRole('button', { name: 'Iniciar treino' }).first().click()

    // Volta para a pendente, com a série já registrada intacta.
    await expect(page.locator('[data-serie-registrada]')).toHaveCount(1)
  })
})
