import { expect, test, type Download, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { abrirEditor, abrirLimpo, iniciarTreino, montarTreino, registrarSerie } from './apoio'

/**
 * Descanso planejado e cronômetro — FR-150, FR-172 a FR-183.
 *
 * **Sobre o que havia aqui antes.** A feature 002 deixou nesta suíte um teste
 * chamado "FRONTEIRA CONSTITUCIONAL: não é cronômetro", escrito porque a v1.4.0
 * punha o cronômetro fora de escopo e porque acrescentá-lo pareceria inofensivo
 * numa alteração futura. Ele quebrou nesta feature e disse exatamente o porquê,
 * que era o trabalho dele.
 *
 * A emenda v1.5.0 moveu a fronteira, e não a apagou. O cronômetro é permitido
 * **sob condição de ser iniciado pelo usuário**, porque a proibição nunca foi
 * sobre contar tempo — era sobre o aplicativo impor ritmo a quem treina. O
 * teste de fronteira continua aqui, com a condição nova no lugar da antiga.
 */
test.describe('descanso na execução', () => {
  async function planejarDescanso(page: Page, segundos: string) {
    await abrirEditor(page, 'Treino A')
    await page
      .getByRole('button', { name: /Supino reto com barra/ })
      .first()
      .click()
    await page.getByLabel(/Descanso entre séries/).fill(segundos)
    await page.getByLabel(/Descanso entre séries/).blur()
    await page.waitForTimeout(400)
  }

  test('o descanso planejado chega à execução (FR-150, FR-174)', async ({ page }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', ['Supino reto com barra'])
    await planejarDescanso(page, '90')
    await iniciarTreino(page)

    await expect(page.getByRole('button', { name: 'Descansar 1:30' })).toBeVisible()
  })

  test('sem descanso planejado, a oferta é de dois minutos (FR-174)', async ({ page }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', ['Supino reto com barra'])
    await iniciarTreino(page)

    await expect(page.getByRole('button', { name: 'Descansar 2:00' })).toBeVisible()
  })

  /**
   * FRONTEIRA CONSTITUCIONAL — FR-173, SC-057.
   *
   * A condição da emenda v1.5.0 é o início explícito. Se alguém ligar a
   * contagem ao confirmar uma série, ao focar um exercício ou ao abrir a tela,
   * este teste quebra, e a emenda que permite o cronômetro deixa de valer para
   * o que o aplicativo passou a fazer.
   */
  test('FRONTEIRA CONSTITUCIONAL: nada inicia a contagem sozinho (FR-173)', async ({ page }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', ['Supino reto com barra'])
    await planejarDescanso(page, '5')
    await iniciarTreino(page)

    // Abrir a tela não conta.
    await expect(page.getByRole('button', { name: 'Descansar 0:05' })).toBeVisible()

    // Confirmar uma série não conta.
    await registrarSerie(page, { cargaKg: 40, repeticoes: 10 })
    await expect(page.getByRole('button', { name: 'Descansar 0:05' })).toBeVisible()

    // Seis segundos com um descanso de cinco: se algo tivesse começado, teria
    // chegado a zero e anunciado.
    await page.waitForTimeout(6000)
    await expect(page.getByRole('button', { name: 'Descansar 0:05' })).toBeVisible()
    await expect(page.getByText('Descanso concluído')).toHaveCount(0)
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('iniciado por toque, conta e avisa ao terminar (FR-175, FR-176)', async ({ page }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', ['Supino reto com barra'])
    await planejarDescanso(page, '3')
    await iniciarTreino(page)

    await page.getByRole('button', { name: 'Descansar 0:03' }).click()
    await expect(page.getByRole('timer')).toBeVisible()

    await expect(page.getByText('Descanso concluído')).toBeVisible({ timeout: 8000 })

    // FR-182: o aviso não é diálogo e não captura o foco.
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await page.getByRole('button', { name: 'Dispensar' }).click()
    await expect(page.getByRole('button', { name: 'Descansar 0:03' })).toBeVisible()
  })

  test('cancelar encerra a contagem sem avisar (FR-179)', async ({ page }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', ['Supino reto com barra'])
    await planejarDescanso(page, '90')
    await iniciarTreino(page)

    await page.getByRole('button', { name: 'Descansar 1:30' }).click()
    await expect(page.getByRole('timer')).toBeVisible()

    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByRole('timer')).toHaveCount(0)
    await expect(page.getByText('Descanso concluído')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Descansar 1:30' })).toBeVisible()
  })

  /** SC-060: o Princípio II vale com a contagem rodando. */
  test('com a contagem rodando, o treino segue inteiro (FR-181)', async ({ page }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', ['Supino reto com barra', 'Remada curvada com barra'])
    await planejarDescanso(page, '120')
    await iniciarTreino(page)

    await page.getByRole('button', { name: 'Descansar 2:00' }).click()
    await expect(page.getByRole('timer')).toBeVisible()

    // Registrar uma série, sem toque para dispensar o cronômetro.
    await registrarSerie(page, { cargaKg: 40, repeticoes: 10 })
    await expect(page.getByRole('timer')).toBeVisible()

    // Trocar de exercício: o descanso é da pessoa, não do exercício (FR-180).
    await page
      .getByRole('button', { name: /Remada curvada/ })
      .first()
      .click()
    await expect(page.getByRole('timer')).toBeVisible()

    // E concluir o treino encerra a contagem junto (FR-183).
    await page.getByRole('button', { name: 'Concluir treino' }).first().click()
    await page.getByRole('button', { name: 'Ver no histórico' }).click()
    await expect(page.getByRole('timer')).toHaveCount(0)
  })

  /** SC-059: recarregar não devolve a contagem ao começo. */
  test('a contagem sobrevive a recarregar a página (FR-178)', async ({ page }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', ['Supino reto com barra'])
    await planejarDescanso(page, '120')
    await iniciarTreino(page)

    await page.getByRole('button', { name: 'Descansar 2:00' }).click()
    await page.waitForTimeout(3000)

    await page.reload()
    await page.waitForLoadState('networkidle')

    const restante = await page.getByRole('timer').textContent()
    expect(restante).not.toContain('2:00')
    expect(restante).toMatch(/1:5\d/)
  })

  /**
   * SC-061, FR-186 — a contagem não é registro do que foi executado.
   *
   * Ela vive fora do IndexedDB justamente para que isto seja verdade por
   * construção, e não por uma exclusão que alguém precise lembrar de manter na
   * exportação. O teste confere que a construção está de pé.
   */
  test('a contagem não entra no arquivo de backup (SC-061)', async ({ page }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', ['Supino reto com barra'])
    await planejarDescanso(page, '120')
    await iniciarTreino(page)

    await page.getByRole('button', { name: 'Descansar 2:00' }).click()
    await expect(page.getByRole('timer')).toBeVisible()

    await page.goto('/#/backup')
    await page.waitForLoadState('networkidle')

    const esperaDownload = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportar backup' }).click()
    const download: Download = await esperaDownload
    const caminho = await download.path()
    const conteudo = await readFile(caminho, 'utf8')

    expect(conteudo).not.toContain('iniciadoEm')
    expect(conteudo).not.toContain('duracaoSegundos')
  })
})
