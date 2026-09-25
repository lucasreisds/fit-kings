import { expect, test } from '@playwright/test'
import {
  abrirEditor,
  abrirLimpo,
  concluirTreino,
  iniciarTreino,
  montarTreino,
  registrarSerie,
} from './apoio'

/**
 * T011 — SC-049, SC-050, SC-052.
 *
 * O ciclo da dupla progressão inteiro, pela interface: planejar 6-8, cumprir o
 * topo em todas as séries, e encontrar na sessão seguinte o aviso dizendo para
 * subir a carga. Antes de FR-160 esse percurso não terminava em lugar nenhum —
 * fazer 8 numa faixa de 6-8 era tratado como "na meta", e o aviso só apareceria
 * com 9 repetições, que é sair da faixa planejada.
 */
test.describe('dupla progressão na faixa de repetições', () => {
  test('alcançar o topo em todas as séries indica aumento de carga (SC-049, SC-052)', async ({
    page,
  }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', ['Supino reto com barra'])

    await abrirEditor(page, 'Treino A')
    await page
      .getByRole('button', { name: /Supino reto com barra/ })
      .first()
      .click()

    for (const serie of [1, 2, 3]) {
      await page.getByLabel(`Repetições da série ${serie}`, { exact: true }).fill('6')
      const maximo = page.getByLabel(new RegExp(`Máximo de repetições da série ${serie}`))
      await maximo.fill('8')
      await maximo.blur()
      await page.waitForTimeout(250)
    }
    await page.getByRole('button', { name: 'Concluir' }).click()
    await page.waitForTimeout(400)

    // Primeira sessão: o topo da faixa, exatamente. Nada acima dele.
    await iniciarTreino(page)
    for (const _ of [1, 2, 3]) {
      await registrarSerie(page, { cargaKg: 40, repeticoes: 8 })
    }

    // SC-052: a marca distingue o topo do meio da faixa. Sem isso, o aviso da
    // sessão seguinte apareceria sem que nada na tela explicasse o porquê.
    await expect(page.getByText('▲ topo da faixa').first()).toBeVisible()

    await concluirTreino(page)

    // Segunda sessão: o aviso, com a linguagem da faixa (D3).
    await iniciarTreino(page)
    await expect(page.getByText('Dá para aumentar a carga')).toBeVisible()
    await expect(page.getByText(/alcançou o topo da faixa em todas as séries/)).toBeVisible()
  })

  test('ficar no meio da faixa não indica aumento (SC-050)', async ({ page }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', ['Supino reto com barra'])

    await abrirEditor(page, 'Treino A')
    await page
      .getByRole('button', { name: /Supino reto com barra/ })
      .first()
      .click()

    for (const serie of [1, 2, 3]) {
      await page.getByLabel(`Repetições da série ${serie}`, { exact: true }).fill('6')
      const maximo = page.getByLabel(new RegExp(`Máximo de repetições da série ${serie}`))
      await maximo.fill('8')
      await maximo.blur()
      await page.waitForTimeout(250)
    }
    await page.getByRole('button', { name: 'Concluir' }).click()
    await page.waitForTimeout(400)

    await iniciarTreino(page)
    // Uma série no topo, duas no meio: a faixa não foi dominada.
    await registrarSerie(page, { cargaKg: 40, repeticoes: 8 })
    await registrarSerie(page, { cargaKg: 40, repeticoes: 7 })
    await registrarSerie(page, { cargaKg: 40, repeticoes: 7 })
    await concluirTreino(page)

    await iniciarTreino(page)
    await expect(page.getByText('Dá para aumentar a carga')).toBeHidden()
  })
})
