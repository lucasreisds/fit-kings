import { expect, test } from '@playwright/test'
import { abrirEditor, abrirLimpo, iniciarTreino, montarTreino } from './apoio'

/**
 * T052, T053 — FR-150, FR-151, SC-043.
 *
 * O segundo teste desta suíte não verifica uma funcionalidade: **verifica uma
 * fronteira constitucional**. A constituição v1.4.0 põe o cronômetro de
 * descanso fora de escopo, e esta feature acrescenta o valor escrito.
 *
 * O teste existe porque, com o campo no lugar, acrescentar a contagem
 * regressiva vai parecer inofensivo numa alteração futura. Não é: seria
 * ampliação de escopo vedada, e exige emenda. Se alguém o fizer, este teste
 * quebra e diz o porquê.
 */
test.describe('descanso planejado', () => {
  test('aparece na execução sem toque adicional (FR-150, SC-043)', async ({ page }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', ['Supino reto com barra'])

    await abrirEditor(page, 'Treino A')
    await page.getByRole('button', { name: /Supino reto com barra/ }).first().click()
    await page.getByLabel(/Descanso entre séries/).fill('90')
    await page.getByLabel(/Descanso entre séries/).blur()
    await page.waitForTimeout(400)

    await iniciarTreino(page)

    // Visível de imediato, junto da meta.
    await expect(page.locator('[data-descanso]')).toBeVisible()
    await expect(page.locator('[data-descanso]')).toContainText('90')
  })

  test('exercício sem descanso não exibe nada a respeito', async ({ page }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', ['Supino reto com barra'])
    await iniciarTreino(page)

    // Nada é inventado quando o campo está vazio.
    await expect(page.locator('[data-descanso]')).toHaveCount(0)
  })

  test('FRONTEIRA CONSTITUCIONAL: não é cronômetro (FR-151)', async ({ page }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', ['Supino reto com barra'])

    await abrirEditor(page, 'Treino A')
    await page.getByRole('button', { name: /Supino reto com barra/ }).first().click()
    await page.getByLabel(/Descanso entre séries/).fill('5')
    await page.getByLabel(/Descanso entre séries/).blur()
    await page.waitForTimeout(400)

    await iniciarTreino(page)

    const antes = await page.locator('[data-descanso]').textContent()
    expect(antes).toContain('5')

    // Seis segundos com um descanso de cinco: se houvesse contagem, teria
    // chegado a zero e disparado algo.
    await page.waitForTimeout(6000)

    // O valor não se moveu.
    expect(await page.locator('[data-descanso]').textContent()).toBe(antes)

    // Nada foi anunciado, e nada interrompeu: a tela de execução continua
    // exatamente onde estava, com a série à espera.
    await expect(page.getByRole('button', { name: 'Confirmar série' })).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })
})
