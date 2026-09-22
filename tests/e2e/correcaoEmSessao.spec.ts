import { expect, test } from '@playwright/test'
import { abrirLimpo, concluirTreino, iniciarTreino, montarTreino, registrarSerie } from './apoio'

/**
 * T018 — SC-037, SC-038.
 *
 * O caminho completo do problema relatado: registrar uma série por engano
 * durante o treino e conseguir desfazê-la antes que ela vire histórico.
 */
test.describe('correção durante a sessão', () => {
  test('série removida não chega ao histórico (SC-038)', async ({ page }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', ['Supino reto com barra'])
    await iniciarTreino(page)

    await registrarSerie(page, { cargaKg: 40, repeticoes: 10 })
    await registrarSerie(page, { repeticoes: 10 })
    await registrarSerie(page, { repeticoes: 10 })

    // A quarta, por engano — exatamente o que aconteceu no treino real.
    await page.getByRole('button', { name: 'Registrar série a mais' }).click()
    await registrarSerie(page, { repeticoes: 99 })
    await expect(page.locator('[data-serie-registrada]')).toHaveCount(4)

    // Desfaz.
    await page.getByRole('button', { name: 'Corrigir ou remover a série 4' }).click()
    await page.getByRole('button', { name: 'Remover', exact: true }).click()
    await page.getByRole('button', { name: 'Remover série' }).click()
    await expect(page.locator('[data-serie-registrada]')).toHaveCount(3)

    await concluirTreino(page)
    await page.getByRole('button', { name: /Treino A/ }).first().click()

    // O histórico tem três séries, e nenhuma de 99.
    await expect(page.getByText('99 ×')).toBeHidden()
    await expect(page.getByText('10 × 40 kg').first()).toBeVisible()
  })

  test('corrigir um valor durante a sessão (SC-037, FR-133)', async ({ page }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', ['Supino reto com barra'])
    await iniciarTreino(page)

    await registrarSerie(page, { cargaKg: 40, repeticoes: 8 })

    await page.getByRole('button', { name: 'Corrigir ou remover a série 1' }).click()

    // O painel cobre a tela, mas os campos de trás continuam no DOM — daí o
    // escopo pelo diálogo.
    const painel = page.getByRole('dialog', { name: 'Série 1' })
    await painel.getByLabel('Repetições').fill('12')
    await painel.getByRole('button', { name: 'Salvar' }).click()

    await expect(page.getByText('40 kg × 12')).toBeVisible()

    await registrarSerie(page, { repeticoes: 10 })
    await registrarSerie(page, { repeticoes: 10 })
    await concluirTreino(page)
    await page.getByRole('button', { name: /Treino A/ }).first().click()

    // O valor corrigido é o que foi para o histórico.
    await expect(page.getByText('12 × 40 kg')).toBeVisible()
    await expect(page.getByText('8 × 40 kg')).toBeHidden()
    // E a sessão não foi marcada como corrigida — não houve versionamento.
    await expect(page.getByText(/Corrigido em/)).toBeHidden()
  })

  test('remover a série do meio renumera as seguintes (FR-135)', async ({ page }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', ['Supino reto com barra'])
    await iniciarTreino(page)

    await registrarSerie(page, { cargaKg: 40, repeticoes: 8 })
    await registrarSerie(page, { repeticoes: 9 })
    await registrarSerie(page, { repeticoes: 10 })

    await page.getByRole('button', { name: 'Corrigir ou remover a série 2' }).click()
    await page.getByRole('button', { name: 'Remover', exact: true }).click()
    await page.getByRole('button', { name: 'Remover série' }).click()

    await expect(page.locator('[data-serie-registrada]')).toHaveCount(2)
    // A que era a terceira agora é a segunda.
    await expect(page.locator('[data-serie-registrada="2"]')).toContainText('10')
    await expect(page.locator('[data-serie-registrada="3"]')).toHaveCount(0)
  })
})
