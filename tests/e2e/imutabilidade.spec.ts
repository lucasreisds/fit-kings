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
 * **Portão 2 da constituição** — imutabilidade do histórico diante de edição e
 * de exclusão do treino de origem.
 *
 * A sessão carrega sua própria cópia dos valores planejados (FR-017), e por
 * isso nada que aconteça com o treino depois a alcança — nem a edição, nem a
 * exclusão. Cobre FR-017, FR-040 e SC-013.
 */
test.describe('Portão 2 — imutabilidade do histórico', () => {
  test('editar e excluir o treino de origem não altera a sessão concluída (SC-013)', async ({
    page,
  }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', ['Supino reto com barra'])
    await iniciarTreino(page)

    await registrarSerie(page, { cargaKg: 40, repeticoes: 11 })
    await registrarSerie(page, { repeticoes: 10 })
    await registrarSerie(page, { repeticoes: 9 })
    await concluirTreino(page)

    // O histórico registra a comparação com o plano daquele dia: meta 10.
    await page.getByRole('button', { name: /Treino A/ }).first().click()
    await expect(page.getByText('10 × 0 kg, RIR 2').first()).toBeVisible()
    await expect(page.getByText('11 × 40 kg')).toBeVisible()

    // --- Editar o treino de origem: troca as metas ---
    await abrirEditor(page, 'Treino A')
    await page.getByRole('button', { name: /Supino reto com barra/ }).first().click()
    await page.getByLabel('Repetições da série 1', { exact: true }).fill('20')
    await page.getByLabel('Carga da série 1 em quilos').fill('99')
    await page.getByLabel('Carga da série 1 em quilos').blur()
    await page.waitForTimeout(400)

    // A sessão no histórico continua com o plano daquele dia.
    await page.goto('/#/historico')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /Treino A/ }).first().click()
    await expect(page.getByText('10 × 0 kg, RIR 2').first()).toBeVisible()
    await expect(page.getByText('20 × 99 kg')).toBeHidden()
    await expect(page.getByText('11 × 40 kg')).toBeVisible()

    // --- Excluir o treino de origem ---
    await page.goto('/#/treinos')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /^Excluir Treino A$/ }).click()
    await page.getByRole('button', { name: 'Excluir treino', exact: true }).click()
    await expect(page.getByText('Nenhum treino ainda')).toBeVisible()

    // O histórico sobrevive à exclusão, com nome e valores intactos (FR-040).
    await page.goto('/#/historico')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Treino A')).toBeVisible()

    await page.getByRole('button', { name: /Treino A/ }).first().click()
    await expect(page.getByText('11 × 40 kg')).toBeVisible()
    await expect(page.getByText('10 × 40 kg')).toBeVisible()
    await expect(page.getByText('9 × 40 kg')).toBeVisible()
    await expect(page.getByText('10 × 0 kg, RIR 2').first()).toBeVisible()
  })

  test('a correção cria versão nova sem mudar a data nem a ordem (FR-114, FR-115)', async ({
    page,
  }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', ['Supino reto com barra'])
    await iniciarTreino(page)
    await registrarSerie(page, { cargaKg: 40, repeticoes: 8 })
    await registrarSerie(page, { repeticoes: 8 })
    await registrarSerie(page, { repeticoes: 8 })
    await concluirTreino(page)

    await page.getByRole('button', { name: /Treino A/ }).first().click()
    const dataAntes = await page.locator('header span').first().textContent()

    await page.getByRole('button', { name: 'Corrigir valores' }).click()
    await page.getByLabel('Repetições da série 1 de Supino reto com barra').fill('12')
    await page.getByRole('button', { name: 'Revisar correção' }).click()

    // A confirmação é explícita e diz o que vai acontecer (FR-118).
    await expect(page.getByText(/versão nova desta sessão/)).toBeVisible()
    await page.getByRole('button', { name: 'Confirmar correção' }).click()

    // A marca de correção aparece, e a data do treino não mudou (FR-115, FR-116).
    await expect(page.getByText(/Corrigido em/)).toBeVisible()
    await expect(page.getByText('12 × 40 kg')).toBeVisible()
    expect(await page.locator('header span').first().textContent()).toBe(dataAntes)
  })
})
