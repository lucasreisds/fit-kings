import { expect, test } from '@playwright/test'
import { abrirLimpo, arrastar, iniciarTreino, montarTreino, registrarSerie } from './apoio'

/**
 * US1 — FR-127 a FR-132, SC-035, SC-036.
 *
 * O defeito que estes testes travam foi encontrado num treino real: com cinco
 * exercícios em tela de 430 px, o quarto e o quinto eram inalcançáveis na
 * prática. A faixa de cartões funcionava e ninguém percebia que era tocável.
 */
const CINCO = [
  'Supino reto com barra',
  'Crucifixo com halteres',
  'Barra fixa',
  'Rosca direta com barra',
  'Tríceps na polia com corda',
]

test.describe('navegação entre exercícios', () => {
  test.use({ viewport: { width: 430, height: 932 } })

  test('todos os 5 exercícios são alcançáveis em 430 px (SC-035, SC-036)', async ({ page }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', CINCO)
    await iniciarTreino(page)

    // A posição é anunciada, o que é a pista de que há mais (FR-127).
    await expect(page.getByText('1 de 5')).toBeVisible()

    // Avançar até o quinto, um toque por exercício (FR-128).
    for (let posicao = 2; posicao <= 5; posicao += 1) {
      await page.getByRole('button', { name: /Próximo exercício:/ }).click()
      await expect(page.getByText(`${posicao} de 5`)).toBeVisible()
    }
    await expect(page.getByRole('heading', { name: CINCO[4] })).toBeVisible()

    // E voltar ao primeiro.
    for (let posicao = 4; posicao >= 1; posicao -= 1) {
      await page.getByRole('button', { name: /Exercício anterior:/ }).click()
      await expect(page.getByText(`${posicao} de 5`)).toBeVisible()
    }
  })

  test('a faixa leva direto a qualquer exercício, inclusive o quinto', async ({ page }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', CINCO)
    await iniciarTreino(page)

    await page.getByRole('tab', { name: new RegExp(CINCO[4]!.slice(0, 14)) }).click()
    await expect(page.getByText('5 de 5')).toBeVisible()
    await expect(page.getByRole('heading', { name: CINCO[4] })).toBeVisible()
  })

  test('arrastar troca de exercício (FR-129)', async ({ page }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', CINCO)
    await iniciarTreino(page)

    await arrastar(page, 'main > div', 'esquerda')
    await expect(page.getByText('2 de 5')).toBeVisible()

    await arrastar(page, 'main > div', 'direita')
    await expect(page.getByText('1 de 5')).toBeVisible()
  })

  test('nas pontas sinaliza o limite sem sair da sessão (FR-131)', async ({ page }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', CINCO)
    await iniciarTreino(page)

    // No primeiro, recuar não leva a lugar nenhum.
    await arrastar(page, 'main > div', 'direita')
    await expect(page.getByText('Este é o primeiro exercício do treino.')).toBeVisible()
    await expect(page.getByText('1 de 5')).toBeVisible()
    // A sessão continua de pé.
    await expect(page.getByRole('button', { name: 'Concluir treino' })).toBeVisible()

    // A seta de anterior fica indisponível, o que já anuncia o limite.
    await expect(page.getByRole('button', { name: 'Este é o primeiro exercício' })).toBeDisabled()
  })

  test('o gesto não dispara dentro de um campo (FR-130)', async ({ page }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', CINCO)
    await iniciarTreino(page)

    await arrastar(page, 'input[aria-labelledby="rotulo-carga"]', 'esquerda')

    // Continua no primeiro exercício: o arraste pertencia ao campo.
    await expect(page.getByText('1 de 5')).toBeVisible()
  })

  test('o gesto não dispara sobre a faixa, que rola por conta própria (FR-130)', async ({
    page,
  }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', CINCO)
    await iniciarTreino(page)

    await arrastar(page, '[role="tablist"]', 'esquerda')

    await expect(page.getByText('1 de 5')).toBeVisible()
  })

  test('trocar de exercício preserva o que já foi registrado (FR-132)', async ({ page }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', CINCO)
    await iniciarTreino(page)

    await registrarSerie(page, { cargaKg: 42.5, repeticoes: 11 })
    await expect(page.locator('[data-serie-registrada]')).toHaveCount(1)

    await page.getByRole('button', { name: /Próximo exercício:/ }).click()
    await expect(page.locator('[data-serie-registrada]')).toHaveCount(0)

    await page.getByRole('button', { name: /Exercício anterior:/ }).click()
    await expect(page.locator('[data-serie-registrada]')).toHaveCount(1)
    await expect(page.getByText('42,5 kg × 11')).toBeVisible()
  })

  test('exercício completo oferece o próximo, não uma série extra (FR-137, FR-138)', async ({
    page,
  }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', CINCO)
    await iniciarTreino(page)

    await registrarSerie(page, { cargaKg: 40, repeticoes: 10 })
    await registrarSerie(page, { repeticoes: 10 })
    await registrarSerie(page, { repeticoes: 10 })

    // O que o usuário vê é a conclusão, não "Série 4 de 4 — série extra".
    await expect(page.getByText('Exercício completo')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Próximo exercício', exact: true })).toBeVisible()
    await expect(page.getByText('série extra')).toBeHidden()
    await expect(page.getByRole('button', { name: 'Confirmar série' })).toBeHidden()

    // A série a mais continua possível, por ação explícita e distinta.
    await page.getByRole('button', { name: 'Registrar série a mais' }).click()
    await expect(page.getByRole('button', { name: 'Confirmar série' })).toBeVisible()
  })
})
