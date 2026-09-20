import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { criarRepositorioTreinos, NomeDeTreinoInvalidoError } from '../../src/dados/repositorios/treinos'
import { criarRepositorioExercicios } from '../../src/dados/repositorios/exercicios'
import { criarBanco, type BancoFitKings } from '../../src/dados/db'
import { novoId } from '../../src/plataforma/id'
import { descartar } from '../apoio/banco'

/**
 * FR-010 — os treinos sobrevivem a fechar e reabrir o aplicativo.
 *
 * O teste reabre o banco de verdade, com o mesmo nome, em vez de reusar a
 * instância. Reusar provaria que o objeto ainda está em memória, que é
 * exatamente o que FR-010 não pergunta.
 */
describe('persistência de treinos', () => {
  let nomeDoBanco: string
  let db: BancoFitKings

  beforeEach(() => {
    nomeDoBanco = `treinos-${novoId()}`
    db = criarBanco(nomeDoBanco)
  })

  afterEach(async () => {
    await descartar(db)
  })

  async function exercicioDeTeste(banco: BancoFitKings, nome: string) {
    return criarRepositorioExercicios(banco).criar({ nome, origem: 'catalogo' })
  }

  it('treino com itens e séries planejadas sobrevive a fechar e reabrir o banco (FR-010)', async () => {
    const repositorio = criarRepositorioTreinos(db)
    const supino = await exercicioDeTeste(db, 'Supino reto')
    const remada = await exercicioDeTeste(db, 'Remada curvada')

    const treino = await repositorio.criar('Treino A')
    await repositorio.adicionarItem(treino.id, {
      exercicioId: supino.id,
      abordagem: 'tradicional',
      series: [
        { repeticoes: 8, cargaKg: 40, rir: 2 },
        { repeticoes: 8, cargaKg: 42.5, rir: 1 },
        { repeticoes: 6, cargaKg: 45, rir: 0 },
      ],
    })
    await repositorio.adicionarItem(treino.id, {
      exercicioId: remada.id,
      abordagem: 'tradicional',
      series: [{ repeticoes: 10, cargaKg: 30, rir: null }],
    })

    db.close()

    const reaberto = criarBanco(nomeDoBanco)
    const completo = await criarRepositorioTreinos(reaberto).obter(treino.id)

    expect(completo).toBeDefined()
    expect(completo!.treino.nome).toBe('Treino A')
    expect(completo!.itens).toHaveLength(2)
    expect(completo!.itens[0]!.series).toHaveLength(3)
    // FR-009: os valores variam entre séries do mesmo exercício.
    expect(completo!.itens[0]!.series.map((s) => s.cargaKg)).toEqual([40, 42.5, 45])
    expect(completo!.itens[0]!.series.map((s) => s.rir)).toEqual([2, 1, 0])
    expect(completo!.itens[1]!.series[0]!.rir).toBeNull()

    reaberto.close()
    db = reaberto
  })

  it('preserva a ordem dos exercícios e a renumera ao reordenar (FR-007)', async () => {
    const repositorio = criarRepositorioTreinos(db)
    const treino = await repositorio.criar('Treino B')
    const nomes = ['Agachamento', 'Leg press', 'Cadeira extensora']
    for (const nome of nomes) {
      const exercicio = await exercicioDeTeste(db, nome)
      await repositorio.adicionarItem(treino.id, {
        exercicioId: exercicio.id,
        abordagem: 'tradicional',
        series: [{ repeticoes: 10, cargaKg: 50, rir: null }],
      })
    }

    const antes = await repositorio.obter(treino.id)
    expect(antes!.itens.map((i) => i.item.ordem)).toEqual([1, 2, 3])

    await repositorio.reordenarItens(treino.id, 2, 0)

    const depois = await repositorio.obter(treino.id)
    expect(depois!.itens.map((i) => i.item.ordem)).toEqual([1, 2, 3])
    expect(depois!.itens[0]!.item.exercicioId).toBe(antes!.itens[2]!.item.exercicioId)
    expect(depois!.itens[2]!.item.exercicioId).toBe(antes!.itens[1]!.item.exercicioId)
  })

  it('remover um exercício do meio mantém a ordem contígua (FR-007)', async () => {
    const repositorio = criarRepositorioTreinos(db)
    const treino = await repositorio.criar('Treino C')
    for (const nome of ['Um', 'Dois', 'Três']) {
      const exercicio = await exercicioDeTeste(db, nome)
      await repositorio.adicionarItem(treino.id, {
        exercicioId: exercicio.id,
        abordagem: 'tradicional',
        series: [{ repeticoes: 10, cargaKg: 20, rir: null }],
      })
    }

    const completo = await repositorio.obter(treino.id)
    await repositorio.removerItem(treino.id, completo!.itens[1]!.item.id)

    const depois = await repositorio.obter(treino.id)
    expect(depois!.itens.map((i) => i.item.ordem)).toEqual([1, 2])
  })

  it('definirSeries substitui o conjunto sem remover fisicamente as que saem', async () => {
    const repositorio = criarRepositorioTreinos(db)
    const treino = await repositorio.criar('Treino D')
    const exercicio = await exercicioDeTeste(db, 'Rosca direta')
    const item = await repositorio.adicionarItem(treino.id, {
      exercicioId: exercicio.id,
      abordagem: 'tradicional',
      series: [
        { repeticoes: 10, cargaKg: 20, rir: 2 },
        { repeticoes: 10, cargaKg: 20, rir: 2 },
        { repeticoes: 10, cargaKg: 20, rir: 2 },
      ],
    })

    const antes = await db.seriesPlanejadas.count()
    await repositorio.definirSeries(item.item.id, [{ repeticoes: 12, cargaKg: 17.5, rir: 1 }])

    const completo = await repositorio.obter(treino.id)
    expect(completo!.itens[0]!.series).toHaveLength(1)
    expect(completo!.itens[0]!.series[0]!.cargaKg).toBe(17.5)
    // As duas que saíram continuam na tabela, marcadas — uma sessão pode
    // referenciá-las por `seriePlanejadaId`.
    expect(await db.seriesPlanejadas.count()).toBe(antes)
  })

  it('excluir um treino é lógico e em cascata', async () => {
    const repositorio = criarRepositorioTreinos(db)
    const treino = await repositorio.criar('Treino E')
    const exercicio = await exercicioDeTeste(db, 'Stiff')
    await repositorio.adicionarItem(treino.id, {
      exercicioId: exercicio.id,
      abordagem: 'tradicional',
      series: [{ repeticoes: 8, cargaKg: 60, rir: 1 }],
    })

    await repositorio.excluir(treino.id)

    expect(await repositorio.obter(treino.id)).toBeUndefined()
    expect(await repositorio.listar()).toHaveLength(0)
    // Nada foi removido fisicamente (Princípio IV).
    expect(await db.treinos.count()).toBe(1)
    expect(await db.itensTreino.count()).toBe(1)
    expect(await db.seriesPlanejadas.count()).toBe(1)
    expect((await db.treinos.get(treino.id))?.excluidoEm).not.toBeNull()
  })

  it('recusa criar treino sem nome (FR-001)', async () => {
    const repositorio = criarRepositorioTreinos(db)
    await expect(repositorio.criar('   ')).rejects.toThrow(NomeDeTreinoInvalidoError)
  })

  it('a abordagem dropset é apenas um valor do campo (FR-013, FR-014)', async () => {
    const repositorio = criarRepositorioTreinos(db)
    const treino = await repositorio.criar('Treino F')
    const exercicio = await exercicioDeTeste(db, 'Elevação lateral')
    const item = await repositorio.adicionarItem(treino.id, {
      exercicioId: exercicio.id,
      abordagem: 'dropset',
      series: [{ repeticoes: 12, cargaKg: 10, rir: 0 }],
    })

    expect(item.item.abordagem).toBe('dropset')
    await repositorio.definirAbordagem(item.item.id, 'tradicional')
    const completo = await repositorio.obter(treino.id)
    expect(completo!.itens[0]!.item.abordagem).toBe('tradicional')
  })
})
