import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { bancoDeTeste, descartar } from '../apoio/banco'
import type { BancoFitKings } from '../../src/dados/db'
import { montarCenario, TRES_POR_OITO } from '../apoio/cenario'
import { execucaoAnteriorNoTreino } from '../../src/funcionalidades/execucao/consultas'
import type { Id } from '../../src/domain/tipos'

/**
 * T010 — FR-195, FR-196, FR-202.
 *
 * "A última vez **neste treino**." Cada caso aqui separa uma palavra da frase:
 * concluída, versão vigente, mesmo treino, com série válida, e — no caso raro
 * do exercício repetido — a mesma ocorrência.
 */
describe('execução anterior no mesmo treino (FR-195)', () => {
  let db: BancoFitKings

  beforeEach(() => {
    db = bancoDeTeste()
  })

  afterEach(async () => {
    await descartar(db)
  })

  type Cenario = Awaited<ReturnType<typeof montarCenario>>
  type Serie = { repeticoes: number | null; cargaKg?: number; naoRealizada?: boolean }

  /**
   * Executa `treinoId` com o supino aparecendo uma vez por lista de séries —
   * duas listas = o exercício duas vezes na mesma sessão.
   */
  async function executar(
    cenario: Cenario,
    treinoId: Id,
    porOcorrencia: readonly (readonly Serie[])[],
    encerrar: 'concluir' | 'descartar' | 'deixar' = 'concluir',
  ) {
    const supino = cenario.itens[0]!.exercicio
    const sessao = await cenario.sessoes.criar({
      treinoId,
      nomeTreino: 'T',
      exercicios: porOcorrencia.map((_, indice) => ({
        exercicioId: supino.id,
        ordem: indice + 1,
        abordagem: 'tradicional' as const,
        origem: 'fora_do_plano' as const,
        itemTreinoId: null,
      })),
    })

    for (const [indice, series] of porOcorrencia.entries()) {
      for (const [ordem, serie] of series.entries()) {
        await cenario.sessoes.registrarSerie(sessao.exercicios[indice]!.exercicio.id, {
          ordem: ordem + 1,
          cargaKg: serie.cargaKg ?? 40,
          repeticoes: serie.repeticoes,
          rir: null,
          naoRealizada: serie.naoRealizada ?? false,
          seriePlanejadaId: null,
        })
      }
    }

    if (encerrar !== 'deixar') await cenario.sessoes.encerrar(sessao.sessao.id, encerrar)
    // Espaça os carimbos para que "mais recente" seja inequívoco.
    await new Promise((resolver) => setTimeout(resolver, 3))
    return sessao
  }

  async function treinoB(cenario: Cenario) {
    const treino = await cenario.treinos.criar('Treino B')
    await cenario.treinos.adicionarItem(treino.id, {
      exercicioId: cenario.itens[0]!.exercicio.id,
      abordagem: 'tradicional',
      series: TRES_POR_OITO,
    })
    return treino
  }

  const consultar = (cenario: Cenario, treinoId: Id | null, ocorrencia = 0, ignorar?: Id) =>
    execucaoAnteriorNoTreino(
      cenario.itens[0]!.exercicio.id,
      treinoId,
      ocorrencia,
      ignorar ? { ignorarSessaoId: ignorar } : {},
      db,
    )

  const repeticoes = (resultado: Awaited<ReturnType<typeof consultar>>) =>
    resultado?.series.map((s) => s.repeticoes)

  it('a do mesmo treino vence uma mais recente de outro treino', async () => {
    const cenario = await montarCenario(db)
    const b = await treinoB(cenario)

    await executar(cenario, cenario.treino.id, [[{ repeticoes: 10 }, { repeticoes: 9 }]])
    await executar(cenario, b.id, [[{ repeticoes: 15 }]])

    expect(repeticoes(await consultar(cenario, cenario.treino.id))).toEqual([10, 9])
  })

  it('nunca feito neste treino → nada, mesmo feito em outro (FR-196)', async () => {
    const cenario = await montarCenario(db)
    const b = await treinoB(cenario)
    await executar(cenario, b.id, [[{ repeticoes: 15 }]])

    expect(await consultar(cenario, cenario.treino.id)).toBeNull()
  })

  it('a mais recente do treino, entre várias', async () => {
    const cenario = await montarCenario(db)
    await executar(cenario, cenario.treino.id, [[{ repeticoes: 8 }]])
    await executar(cenario, cenario.treino.id, [[{ repeticoes: 11 }]])

    expect(repeticoes(await consultar(cenario, cenario.treino.id))).toEqual([11])
  })

  it('sessão em que o exercício foi pulado não conta; vale a anterior', async () => {
    const cenario = await montarCenario(db)
    await executar(cenario, cenario.treino.id, [[{ repeticoes: 10 }]])
    await executar(cenario, cenario.treino.id, [[{ repeticoes: null, naoRealizada: true }]])

    expect(repeticoes(await consultar(cenario, cenario.treino.id))).toEqual([10])
  })

  it('sessão descartada ou em andamento não conta', async () => {
    const cenario = await montarCenario(db)
    await executar(cenario, cenario.treino.id, [[{ repeticoes: 10 }]])
    await executar(cenario, cenario.treino.id, [[{ repeticoes: 20 }]], 'descartar')
    await executar(cenario, cenario.treino.id, [[{ repeticoes: 30 }]], 'deixar')

    expect(repeticoes(await consultar(cenario, cenario.treino.id))).toEqual([10])
  })

  it('ignora a própria sessão corrente', async () => {
    const cenario = await montarCenario(db)
    await executar(cenario, cenario.treino.id, [[{ repeticoes: 10 }]])
    const corrente = await executar(cenario, cenario.treino.id, [[{ repeticoes: 12 }]])

    expect(repeticoes(await consultar(cenario, cenario.treino.id, 0, corrente.sessao.id))).toEqual([
      10,
    ])
  })

  it('lê a versão vigente depois de uma correção', async () => {
    const cenario = await montarCenario(db)
    const sessao = await executar(cenario, cenario.treino.id, [[{ repeticoes: 10 }]])
    const serie = (await cenario.sessoes.obter(sessao.sessao.id))!.exercicios[0]!.series[0]!
    await cenario.sessoes.corrigir(sessao.sessao.id, [{ serieId: serie.id, repeticoes: 7 }])

    expect(repeticoes(await consultar(cenario, cenario.treino.id))).toEqual([7])
  })

  it('sessão sem treino de origem não tem referência', async () => {
    const cenario = await montarCenario(db)
    await executar(cenario, cenario.treino.id, [[{ repeticoes: 10 }]])

    expect(await consultar(cenario, null)).toBeNull()
  })

  it('exercício repetido: cada ocorrência compara com a mesma ocorrência', async () => {
    const cenario = await montarCenario(db)
    await executar(cenario, cenario.treino.id, [[{ repeticoes: 10 }], [{ repeticoes: 6 }]])

    expect(repeticoes(await consultar(cenario, cenario.treino.id, 0))).toEqual([10])
    expect(repeticoes(await consultar(cenario, cenario.treino.id, 1))).toEqual([6])
    expect(await consultar(cenario, cenario.treino.id, 2)).toBeNull()
  })

  it('consultar não grava nada (FR-202)', async () => {
    const cenario = await montarCenario(db)
    await executar(cenario, cenario.treino.id, [[{ repeticoes: 10 }]])

    const contar = async () =>
      Promise.all(db.tables.map(async (tabela) => [tabela.name, await tabela.count()] as const))
    const antes = await contar()
    await consultar(cenario, cenario.treino.id)
    expect(await contar()).toEqual(antes)
  })
})
