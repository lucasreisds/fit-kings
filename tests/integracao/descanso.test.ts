import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { bancoDeTeste, descartar } from '../apoio/banco'
import type { BancoFitKings } from '../../src/dados/db'
import { criarRepositorioTreinos } from '../../src/dados/repositorios/treinos'
import { criarRepositorioExercicios } from '../../src/dados/repositorios/exercicios'

/**
 * T051 — FR-148, FR-149.
 *
 * O descanso é **valor planejado, por exercício**. A ausência dele é o estado
 * normal de todo item criado antes desta feature, e não um erro a corrigir.
 */
describe('descanso planejado (FR-148, FR-149)', () => {
  let db: BancoFitKings

  beforeEach(() => {
    db = bancoDeTeste()
  })

  afterEach(async () => {
    await descartar(db)
  })

  async function itemComDescanso(descansoSegundos: number | null) {
    const exercicio = await criarRepositorioExercicios(db).criar({
      nome: 'Supino',
      origem: 'catalogo',
    })
    const treinos = criarRepositorioTreinos(db)
    const treino = await treinos.criar('Treino A')
    const item = await treinos.adicionarItem(treino.id, {
      exercicioId: exercicio.id,
      abordagem: 'tradicional',
      descansoSegundos,
      series: [{ repeticoes: 8, cargaKg: 40, rir: null }],
    })
    return { treinos, treino, item }
  }

  it('persiste o descanso do item', async () => {
    const { item } = await itemComDescanso(90)
    expect(item.item.descansoSegundos).toBe(90)
  })

  it('a ausência é o estado normal, não um erro (FR-149)', async () => {
    const { item } = await itemComDescanso(null)
    expect(item.item.descansoSegundos).toBeNull()
  })

  it('item criado sem informar descanso nasce com null', async () => {
    const exercicio = await criarRepositorioExercicios(db).criar({
      nome: 'Remada',
      origem: 'catalogo',
    })
    const treinos = criarRepositorioTreinos(db)
    const treino = await treinos.criar('Treino B')
    const item = await treinos.adicionarItem(treino.id, {
      exercicioId: exercicio.id,
      abordagem: 'tradicional',
      series: [{ repeticoes: 8, cargaKg: 40, rir: null }],
    })
    expect(item.item.descansoSegundos).toBeNull()
  })

  it('pode ser definido e removido depois', async () => {
    const { treinos, treino, item } = await itemComDescanso(null)

    await treinos.definirDescanso(item.item.id, 120)
    let completo = await treinos.obter(treino.id)
    expect(completo!.itens[0]!.item.descansoSegundos).toBe(120)

    await treinos.definirDescanso(item.item.id, null)
    completo = await treinos.obter(treino.id)
    expect(completo!.itens[0]!.item.descansoSegundos).toBeNull()
  })

  it('não é copiado para a sessão — não entra em comparação (D6)', async () => {
    const { item } = await itemComDescanso(90)

    // O registro da sessão não tem campo de descanso: ele é lido do item do
    // treino na hora de exibir, e só existe enquanto o treino corre.
    const colunas = Object.keys(
      (await db.itensTreino.get(item.item.id)) as Record<string, unknown>,
    )
    expect(colunas).toContain('descansoSegundos')

    const exercicioSessao = {
      sessaoVersaoId: 'x',
      exercicioId: 'y',
      ordem: 1,
      abordagem: 'tradicional',
      origem: 'planejado' as const,
      itemTreinoId: item.item.id,
      naoRealizado: false,
    }
    expect(Object.keys(exercicioSessao)).not.toContain('descansoSegundos')
  })
})
