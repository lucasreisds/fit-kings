import { expect, test, type Page } from '@playwright/test'
import { abrirLimpo, iniciarTreino, montarTreino, registrarSerie } from './apoio'

/**
 * T008 — SC-054, SC-055, SC-056.
 *
 * O caminho que o defeito fechava: subir a carga entre séries para um número
 * que não compartilha o primeiro dígito com o anterior. Com 45 herdados dava
 * para chegar a 49, apagando só o segundo dígito, e não dava para chegar a 50.
 */
test.describe('campo de carga durante a execução', () => {
  const carga = (page: Page) => page.locator('input[aria-labelledby="rotulo-carga"]')

  test('apagar dígito a dígito esvazia o campo e ele fica vazio (SC-054, SC-055)', async ({
    page,
  }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', ['Supino reto com barra'])
    await iniciarTreino(page)

    await registrarSerie(page, { cargaKg: 45, repeticoes: 10 })

    // A série 2 herda 45, como o Princípio II manda.
    await expect(carga(page)).toHaveValue('45')

    // Uma tecla de cada vez, que é como o defeito aparecia.
    await carga(page).click()
    await carga(page).press('End')
    await carga(page).press('Backspace')
    await expect(carga(page)).toHaveValue('4')

    await carga(page).press('Backspace')
    // Aqui a herança voltava e escrevia 45 por cima.
    await expect(carga(page)).toHaveValue('')

    // E continua vazio: não é um piscar antes de a herança voltar.
    await page.waitForTimeout(600)
    await expect(carga(page)).toHaveValue('')

    await carga(page).pressSequentially('50', { delay: 60 })
    await expect(carga(page)).toHaveValue('50')

    await registrarSerie(page, { repeticoes: 10 })
    await expect(page.getByText('50 kg × 10')).toBeVisible()
  })

  test('quem não toca no campo continua vendo a carga herdada (SC-056)', async ({ page }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', ['Supino reto com barra'])
    await iniciarTreino(page)

    await registrarSerie(page, { cargaKg: 45, repeticoes: 10 })
    await expect(carga(page)).toHaveValue('45')

    await registrarSerie(page, { repeticoes: 8 })
    await expect(carga(page)).toHaveValue('45')
    await expect(page.getByText('45 kg × 8')).toBeVisible()
  })

  /** FR-169: o que fica gravado é o que estava na tela. */
  test('confirmar com o campo apagado registra a série sem carga', async ({ page }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', ['Supino reto com barra'])
    await iniciarTreino(page)

    await registrarSerie(page, { cargaKg: 45, repeticoes: 10 })
    await carga(page).fill('')
    await expect(carga(page)).toHaveValue('')

    await registrarSerie(page, { repeticoes: 12 })
    await expect(page.locator('[data-serie-registrada="2"]')).not.toContainText('45 kg')
  })
})
