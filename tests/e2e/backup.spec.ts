import { expect, test, type Download } from '@playwright/test'
import { abrirLimpo, limparArmazenamento, montarTreino } from './apoio'

/**
 * **Portão 3 da constituição** — importação idempotente e recusa de arquivo
 * inválido sem alterar dados existentes.
 *
 * Cobre FR-102, FR-104, FR-106, SC-017, SC-018.
 */
test.describe('Portão 3 — backup', () => {
  test('exportar, importar, importar de novo: nada duplica (SC-017)', async ({ page }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', ['Supino reto com barra', 'Crucifixo com halteres'])

    await expect(page.getByText('Treino A')).toBeVisible()

    // --- Exportar ---
    await page.goto('/#/backup')
    const esperaDownload = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportar backup' }).click()
    const download: Download = await esperaDownload
    const caminho = await download.path()
    expect(caminho).toBeTruthy()

    // A data do último backup só aparece depois de a entrega concluir (FR-110).
    await expect(page.getByText('nunca exportado')).toBeHidden()

    // --- Importar sobre o mesmo aparelho: tudo já está lá ---
    await page.setInputFiles('input[type="file"]', caminho!)
    await expect(page.getByText('Conferir antes de importar')).toBeVisible()
    await expect(page.getByText(/já está neste aparelho/)).toBeVisible()
    // Sem nada a fazer, o botão de importar fica indisponível.
    await expect(page.getByRole('button', { name: 'Importar' })).toBeDisabled()
    await page.getByRole('button', { name: 'Cancelar' }).click()

    // --- Aparelho novo: importar de verdade ---
    await limparArmazenamento(page)
    await page.goto('/#/treinos')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Nenhum treino ainda')).toBeVisible()

    await page.goto('/#/backup')
    await page.setInputFiles('input[type="file"]', caminho!)
    await page.getByRole('button', { name: 'Importar' }).click()
    await expect(page.getByText('Importação concluída')).toBeVisible()

    await page.goto('/#/treinos')
    await expect(page.getByText('Treino A')).toBeVisible()
    await expect(page.getByText('2 exercícios')).toBeVisible()

    // --- Segunda importação do mesmo arquivo: operação nula (FR-104) ---
    await page.goto('/#/backup')
    await page.setInputFiles('input[type="file"]', caminho!)
    await expect(page.getByText(/já está neste aparelho/)).toBeVisible()
    await page.getByRole('button', { name: 'Cancelar' }).click()

    // Nada duplicou.
    await page.goto('/#/treinos')
    await expect(page.getByText('Treino A')).toHaveCount(1)
    await expect(page.getByText('2 exercícios')).toBeVisible()
  })

  test.describe('recusa de arquivo inválido sem alterar dado existente (SC-018)', () => {
    const casos = [
      {
        nome: 'arquivo truncado',
        conteudo: '{"formatVersion":1,"exercicios":[{"id":"abc"',
        esperado: /JSON válido|truncado/i,
      },
      {
        nome: 'JSON de outro aplicativo',
        conteudo: JSON.stringify({ usuarios: [], pedidos: [] }),
        esperado: /versão do formato/i,
      },
      {
        nome: 'formatVersion maior que o suportado',
        conteudo: JSON.stringify({
          formatVersion: 99,
          geradoEm: '2026-06-01T12:00:00.000Z',
          exercicios: [],
          treinos: [],
          itensTreino: [],
          seriesPlanejadas: [],
          sessoes: [],
          exerciciosSessao: [],
          seriesRealizadas: [],
        }),
        esperado: /versão mais nova/i,
      },
    ]

    for (const caso of casos) {
      test(caso.nome, async ({ page }) => {
        await abrirLimpo(page)
        await montarTreino(page, 'Treino intacto', ['Supino reto com barra'])

        await page.goto('/#/backup')
        await page.setInputFiles('input[type="file"]', {
          name: 'suspeito.json',
          mimeType: 'application/json',
          buffer: Buffer.from(caso.conteudo, 'utf8'),
        })

        // Mensagem específica para cada caso, não um erro genérico.
        await expect(page.getByText(caso.esperado)).toBeVisible()
        await expect(page.getByText('Nenhum dado deste aparelho foi alterado.')).toBeVisible()
        // A tela de confirmação nunca aparece: não há o que confirmar.
        await expect(page.getByText('Conferir antes de importar')).toBeHidden()

        // O treino continua exatamente como estava.
        await page.goto('/#/treinos')
        await expect(page.getByText('Treino intacto')).toBeVisible()
        await expect(page.getByText('1 exercício')).toBeVisible()
      })
    }
  })
})
