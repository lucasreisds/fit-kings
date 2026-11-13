import { expect, test, type Page } from '@playwright/test'
import { abrirEditor, abrirLimpo, montarTreino } from './apoio'

/**
 * T004 — SC-062, SC-063, FR-187 a FR-190, FR-203.
 *
 * O caminho do usuário: acrescentar o exercício, ajustar só a série 1 e ver as
 * outras acompanharem — sem tocar nelas, e sobrevivendo a sair e voltar.
 */
const EXERCICIO = 'Supino reto com barra'

async function abrirExercicio(pagina: Page) {
  await abrirEditor(pagina, 'Treino A')
  await pagina
    .getByRole('button', { name: new RegExp(EXERCICIO) })
    .first()
    .click()
}

const carga = (pagina: Page, n: number) => pagina.getByLabel(`Carga da série ${n} em quilos`)
const reps = (pagina: Page, n: number) =>
  pagina.getByLabel(`Repetições da série ${n}`, { exact: true })

async function esperarGravar(pagina: Page) {
  await pagina.waitForTimeout(400)
}

test.describe('séries que acompanham a primeira', () => {
  test('ajustar a série 1 preenche as demais, e a personalizada fica (SC-062, SC-063)', async ({
    page,
  }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', [EXERCICIO])
    await abrirExercicio(page)

    // Chega a 4 séries. A nova nasce igual à última.
    await page.getByRole('button', { name: 'Acrescentar série' }).click()
    await expect(carga(page, 4)).toBeVisible()

    // Tecla a tecla, como no polegar: "4", depois "40".
    await carga(page, 1).fill('')
    await carga(page, 1).pressSequentially('40', { delay: 80 })
    await esperarGravar(page)
    for (const n of [1, 2, 3, 4]) await expect(carga(page, n)).toHaveValue('40')

    // A série 4 ganha valor próprio.
    await carga(page, 4).fill('35')
    await esperarGravar(page)
    await expect(carga(page, 3)).toHaveValue('40')

    // A 1 muda de novo: 2 e 3 acompanham, a 4 não.
    await carga(page, 1).fill('42.5')
    await esperarGravar(page)
    await expect(carga(page, 2)).toHaveValue('42.5')
    await expect(carga(page, 3)).toHaveValue('42.5')
    await expect(carga(page, 4)).toHaveValue('35')
  })

  test('continua valendo depois de sair e reabrir o treino (FR-190)', async ({ page }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', [EXERCICIO])
    await abrirExercicio(page)

    await carga(page, 3).fill('30')
    await esperarGravar(page)

    await page.getByRole('button', { name: 'Concluir' }).click()
    await esperarGravar(page)
    await abrirExercicio(page)

    await reps(page, 1).fill('8')
    await esperarGravar(page)
    await expect(reps(page, 2)).toHaveValue('8')
    // A série 3 tinha carga própria e por isso não acompanha nem nas repetições.
    await expect(reps(page, 3)).toHaveValue('10')
  })
})
