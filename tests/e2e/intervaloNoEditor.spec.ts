import { expect, test } from '@playwright/test'
import { abrirEditor, abrirLimpo, iniciarTreino, montarTreino } from './apoio'

/**
 * T011, T012 — SC-044, SC-045, SC-047.
 *
 * O ciclo que o defeito interrompia: planejar um intervalo, sair, voltar, e
 * encontrá-lo. Nenhum teste percorria esse caminho, e era exatamente ali que o
 * valor se perdia.
 */
test.describe('intervalo de repetições no editor', () => {
  test('o intervalo planejado sobrevive a sair e voltar (SC-044, SC-047)', async ({ page }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', ['Supino reto com barra'])

    await abrirEditor(page, 'Treino A')
    await page
      .getByRole('button', { name: /Supino reto com barra/ })
      .first()
      .click()

    const minimo = page.getByLabel('Repetições da série 1', { exact: true })
    const maximo = page.getByLabel(/Máximo de repetições da série 1/)

    await minimo.fill('6')
    await maximo.fill('8')
    await maximo.blur()
    await page.waitForTimeout(400)

    // Visível no ato — era isto que não acontecia.
    await expect(maximo).toHaveValue('8')

    // Sai do editor e volta.
    await page.getByRole('button', { name: 'Concluir' }).click()
    await page.waitForTimeout(400)
    await abrirEditor(page, 'Treino A')
    await page
      .getByRole('button', { name: /Supino reto com barra/ })
      .first()
      .click()

    await expect(page.getByLabel('Repetições da série 1', { exact: true })).toHaveValue('6')
    await expect(page.getByLabel(/Máximo de repetições da série 1/)).toHaveValue('8')
  })

  test('digitar dois dígitos produz o número, não o último dígito (SC-045)', async ({ page }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', ['Supino reto com barra'])

    await abrirEditor(page, 'Treino A')
    await page
      .getByRole('button', { name: /Supino reto com barra/ })
      .first()
      .click()

    const maximo = page.getByLabel(/Máximo de repetições da série 1/)
    // Tecla a tecla, que é como o defeito aparecia: cada dígito substituía o
    // anterior porque o campo se esvaziava entre um e outro.
    await maximo.pressSequentially('12', { delay: 80 })
    await maximo.blur()
    await page.waitForTimeout(400)

    await expect(maximo).toHaveValue('12')
  })

  test('esvaziar o campo devolve a série ao valor único (SC-046)', async ({ page }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', ['Supino reto com barra'])

    await abrirEditor(page, 'Treino A')
    await page
      .getByRole('button', { name: /Supino reto com barra/ })
      .first()
      .click()

    const maximo = page.getByLabel(/Máximo de repetições da série 1/)
    await maximo.fill('9')
    await maximo.blur()
    await page.waitForTimeout(300)
    await expect(maximo).toHaveValue('9')

    await maximo.fill('')
    await maximo.blur()
    await page.waitForTimeout(400)

    await expect(maximo).toHaveValue('')

    // E a meta da execução volta a ser de valor único.
    await iniciarTreino(page)
    await expect(page.getByText(/meta 10 reps/)).toBeVisible()
  })

  test('o intervalo planejado chega à execução (T012)', async ({ page }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', ['Supino reto com barra'])

    await abrirEditor(page, 'Treino A')
    await page
      .getByRole('button', { name: /Supino reto com barra/ })
      .first()
      .click()
    await page.getByLabel('Repetições da série 1', { exact: true }).fill('6')
    await page.getByLabel(/Máximo de repetições da série 1/).fill('8')
    await page.getByLabel(/Máximo de repetições da série 1/).blur()
    await page.waitForTimeout(400)
    await page.getByRole('button', { name: 'Concluir' }).click()
    await page.waitForTimeout(400)

    await iniciarTreino(page)

    // A meta mostra a faixa, e os atalhos usam as pontas dela.
    await expect(page.getByText(/meta 6-8 reps/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Fiz 8' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Fiz 9' })).toBeVisible()
  })

  /**
   * FR-166 — a segunda tecla não pode desfazer a primeira.
   *
   * O editor grava a cada tecla e relê por `liveQuery`. Entre a escrita e o
   * retorno há uma ida ao IndexedDB, e nessa janela a tela ainda mostra o valor
   * anterior. Enquanto a alteração era montada sobre o que a tela tinha em
   * mãos, preencher o mínimo e o máximo em seguida gravava `{ 10, 8 }`: o 6
   * sumia sem aviso, que é o Princípio I pelo avesso.
   *
   * **A CPU estrangulada não é firula.** Numa máquina de desenvolvimento a
   * janela é estreita demais para o defeito aparecer, e ele passou despercebido
   * por duas versões aqui enquanto derrubava a integração contínua. Com o
   * estrangulamento ele falha todas as vezes — foi assim que foi encontrado.
   */
  test('preencher mínimo e máximo em seguida não perde o mínimo (FR-166)', async ({ page }) => {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 20 })

    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', ['Supino reto com barra'])
    await abrirEditor(page, 'Treino A')
    await page
      .getByRole('button', { name: /Supino reto com barra/ })
      .first()
      .click()

    // Sem espera entre um campo e outro — é o que um polegar comum faz.
    await page.getByLabel('Repetições da série 1', { exact: true }).fill('6')
    await page.getByLabel(/Máximo de repetições da série 1/).fill('8')
    await page.waitForTimeout(1500)

    await expect(page.getByLabel('Repetições da série 1', { exact: true })).toHaveValue('6')
    await expect(page.getByLabel(/Máximo de repetições da série 1/)).toHaveValue('8')
  })
})
