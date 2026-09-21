import { expect, test, type Download } from '@playwright/test'
import {
  abrirLimpo,
  concluirTreino,
  iniciarTreino,
  limparArmazenamento,
  montarTreino,
  registrarSerie,
} from './apoio'

/**
 * T133 — SC-026, FR-105.
 *
 * **Exportar, limpar o aparelho, importar: a identidade do exercício
 * atravessa.** O `id` nunca é regenerado na importação — regenerá-lo
 * fragmentaria a série histórica do usuário de forma irreversível, e o defeito
 * só apareceria meses depois, quando já não houvesse conserto.
 *
 * O último passo prova que o vínculo é pelo `id` e não pelo nome: um exercício
 * renomeado **depois** da exportação continua sendo o mesmo registro.
 */
test.describe('identidade do exercício no ciclo de backup', () => {
  test('exportar → limpar → importar preserva as execuções (SC-026, FR-105)', async ({ page }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', ['Supino reto com barra', 'Remada curvada com barra'])

    // Duas sessões concluídas, com cargas diferentes.
    for (const [carga, reps] of [
      [40, 11],
      [42.5, 10],
    ] as const) {
      await iniciarTreino(page)
      await registrarSerie(page, { cargaKg: carga, repeticoes: reps })
      await registrarSerie(page, { repeticoes: reps })
      await registrarSerie(page, { repeticoes: reps })
      await concluirTreino(page)
    }

    // --- Estado de referência: a evolução do supino, valor a valor ---
    await page.goto('/#/historico')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /Treino A/ }).first().click()
    await page.getByRole('button', { name: 'Ver este exercício ao longo do tempo' }).first().click()
    await expect(page.getByText('2 execuções registradas')).toBeVisible()

    const antes = await page.locator('[class*="metaSessao"]').allTextContents()
    expect(antes.length).toBeGreaterThan(0)

    // --- Exportar ---
    await page.goto('/#/backup')
    const esperaDownload = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportar backup' }).click()
    const download: Download = await esperaDownload
    const caminho = await download.path()

    // --- Limpar o armazenamento: equivale a um aparelho novo ---
    await limparArmazenamento(page)
    await page.goto('/#/treinos')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Nenhum treino ainda')).toBeVisible()
    await page.goto('/#/historico')
    await expect(page.getByText('Nenhum treino registrado ainda')).toBeVisible()

    // --- Importar ---
    await page.goto('/#/backup')
    await page.setInputFiles('input[type="file"]', caminho!)
    await page.getByRole('button', { name: 'Importar' }).click()
    await expect(page.getByText('Importação concluída')).toBeVisible()

    // --- 100% das execuções continuam vinculadas aos mesmos exercícios ---
    await page.goto('/#/historico')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /Treino A/ }).first().click()
    await page.getByRole('button', { name: 'Ver este exercício ao longo do tempo' }).first().click()

    await expect(page.getByText('2 execuções registradas')).toBeVisible()
    const depois = await page.locator('[class*="metaSessao"]').allTextContents()
    // Resultado idêntico ao do aparelho de origem, valor a valor.
    expect(depois).toEqual(antes)
  })

  test('um exercício renomeado depois da exportação continua sendo o mesmo (FR-105)', async ({
    page,
  }) => {
    await abrirLimpo(page)
    await montarTreino(page, 'Treino A', ['Supino reto com barra'])
    await iniciarTreino(page)
    await registrarSerie(page, { cargaKg: 40, repeticoes: 11 })
    await registrarSerie(page, { repeticoes: 10 })
    await registrarSerie(page, { repeticoes: 9 })
    await concluirTreino(page)

    await page.goto('/#/backup')
    const esperaDownload = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportar backup' }).click()
    const caminho = await (await esperaDownload).path()

    // Renomeia **depois** da exportação. O arquivo carrega o nome antigo, o
    // aparelho tem o novo — e o `id` é o mesmo nos dois.
    const idDoExercicio = await page.evaluate(async () => {
      const abrir = () =>
        new Promise<IDBDatabase>((resolver, rejeitar) => {
          const pedido = indexedDB.open('fit-kings')
          pedido.onsuccess = () => resolver(pedido.result)
          pedido.onerror = () => rejeitar(pedido.error)
        })
      const db = await abrir()
      const exercicios = await new Promise<{ id: string; nome: string }[]>((resolver) => {
        const pedido = db.transaction('exercicios').objectStore('exercicios').getAll()
        pedido.onsuccess = () => resolver(pedido.result)
      })
      const supino = exercicios.find((e) => e.nome === 'Supino reto com barra')!

      await new Promise<void>((resolver) => {
        const loja = db.transaction('exercicios', 'readwrite').objectStore('exercicios')
        const leitura = loja.get(supino.id)
        leitura.onsuccess = () => {
          const registro = leitura.result
          registro.nome = 'Supino renomeado'
          registro.alteradoEm = new Date(Date.now() + 60_000).toISOString()
          loja.put(registro).onsuccess = () => resolver()
        }
      })
      db.close()
      return supino.id
    })

    await page.goto('/#/backup')
    await page.setInputFiles('input[type="file"]', caminho!)
    await page.getByRole('button', { name: 'Cancelar' }).click()

    // O `id` não mudou, e o histórico continua vinculado a ele.
    const vinculos = await page.evaluate(async () => {
      const abrir = () =>
        new Promise<IDBDatabase>((resolver) => {
          const pedido = indexedDB.open('fit-kings')
          pedido.onsuccess = () => resolver(pedido.result)
        })
      const db = await abrir()
      const registros = await new Promise<{ exercicioId: string }[]>((resolver) => {
        const pedido = db.transaction('exerciciosSessao').objectStore('exerciciosSessao').getAll()
        pedido.onsuccess = () => resolver(pedido.result)
      })
      const exercicios = await new Promise<{ id: string; nome: string }[]>((resolver) => {
        const pedido = db.transaction('exercicios').objectStore('exercicios').getAll()
        pedido.onsuccess = () => resolver(pedido.result)
      })
      db.close()
      return {
        exercicioIds: registros.map((r) => r.exercicioId),
        nomes: exercicios.map((e) => e.nome),
      }
    })

    // O histórico continua apontando para o mesmo identificador.
    expect(vinculos.exercicioIds).toContain(idDoExercicio)
    expect(vinculos.nomes).toContain('Supino renomeado')
    // E o nome antigo, que ainda está no arquivo, não virou um segundo registro.
    expect(vinculos.nomes).not.toContain('Supino reto com barra')
  })
})
