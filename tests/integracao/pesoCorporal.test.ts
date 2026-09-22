import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { bancoDeTeste, descartar } from '../apoio/banco'
import type { BancoFitKings } from '../../src/dados/db'
import { montarCenario } from '../apoio/cenario'
import { criarRepositorioHistorico } from '../../src/dados/repositorios/historico'
import { agregarEvolucao, valorDoPonto } from '../../src/domain/evolucao/agregar'

/**
 * T046 — SC-041.
 *
 * O caminho completo do defeito relatado: barra fixa registrada sem carga
 * aparecia como "0 execuções" na tela de Progresso, embora as séries tivessem
 * repetições registradas e fossem válidas pela definição de FR-092.
 */
describe('exercício de peso corporal no progresso (SC-041)', () => {
  let db: BancoFitKings

  beforeEach(() => {
    db = bancoDeTeste()
  })

  afterEach(async () => {
    await descartar(db)
  })

  async function duasSessoesDeBarraFixa(cargaKg: number | null) {
    const cenario = await montarCenario(db, {
      exercicios: [
        {
          nome: 'Barra fixa',
          series: [
            { repeticoes: 6, cargaKg: 0, rir: null },
            { repeticoes: 6, cargaKg: 0, rir: null },
          ],
        },
      ],
    })
    const item = cenario.itens[0]!

    for (const [indice, reps] of [8, 10].entries()) {
      const sessao = await cenario.sessoes.criar({
        treinoId: cenario.treino.id,
        nomeTreino: cenario.treino.nome,
        exercicios: [
          {
            exercicioId: item.exercicio.id,
            ordem: 1,
            abordagem: 'tradicional',
            origem: 'planejado',
            itemTreinoId: item.item.item.id,
          },
        ],
      })

      for (const ordem of [1, 2]) {
        await cenario.sessoes.registrarSerie(sessao.exercicios[0]!.exercicio.id, {
          ordem,
          // Carga em branco: o gesto natural para peso corporal.
          cargaKg,
          repeticoes: reps,
          rir: null,
          seriePlanejadaId: null,
        })
      }
      await cenario.sessoes.encerrar(sessao.sessao.id, 'concluir')
      await new Promise((resolver) => setTimeout(resolver, 3))
      void indice
    }

    return { cenario, item }
  }

  async function evolucaoDe(exercicioId: string) {
    const execucoes = await criarRepositorioHistorico(db).execucoesDoExercicio(exercicioId)
    return agregarEvolucao(
      execucoes.map((execucao) => ({
        sessaoId: execucao.sessaoId,
        concluidaEm: execucao.concluidaEm,
        series: execucao.series,
      })),
    )
  }

  it('conta as execuções registradas sem carga (FR-145, SC-041)', async () => {
    const { item } = await duasSessoesDeBarraFixa(null)
    const { pontos } = await evolucaoDe(item.exercicio.id)

    // Era zero antes da correção.
    expect(pontos).toHaveLength(2)
  })

  it('apresenta a evolução em repetições (FR-146)', async () => {
    const { item } = await duasSessoesDeBarraFixa(null)
    const { pontos, modo } = await evolucaoDe(item.exercicio.id)

    expect(modo).toBe('repeticoes')
    // A progressão está nas repetições, e é o que a curva mostra.
    expect(pontos.map((ponto) => valorDoPonto(ponto, modo))).toEqual([8, 10])
  })

  it('carga zero informada dá o mesmo resultado (FR-147)', async () => {
    const { item } = await duasSessoesDeBarraFixa(0)
    const { pontos, modo } = await evolucaoDe(item.exercicio.id)

    expect(pontos).toHaveLength(2)
    expect(modo).toBe('repeticoes')
  })

  it('o exercício aparece na lista de quem tem histórico', async () => {
    const { item } = await duasSessoesDeBarraFixa(null)
    const comHistorico = await criarRepositorioHistorico(db).exerciciosComHistorico()
    expect(comHistorico.map((e) => e.id)).toContain(item.exercicio.id)
  })

  it('pôr carga depois muda o modo sozinho, sem migração', async () => {
    const { cenario, item } = await duasSessoesDeBarraFixa(null)
    expect((await evolucaoDe(item.exercicio.id)).modo).toBe('repeticoes')

    // O dia do cinto de lastro.
    const sessao = await cenario.sessoes.criar({
      treinoId: cenario.treino.id,
      nomeTreino: cenario.treino.nome,
      exercicios: [
        {
          exercicioId: item.exercicio.id,
          ordem: 1,
          abordagem: 'tradicional',
          origem: 'planejado',
          itemTreinoId: item.item.item.id,
        },
      ],
    })
    await cenario.sessoes.registrarSerie(sessao.exercicios[0]!.exercicio.id, {
      ordem: 1,
      cargaKg: 10,
      repeticoes: 6,
      rir: null,
      seriePlanejadaId: null,
    })
    await cenario.sessoes.encerrar(sessao.sessao.id, 'concluir')

    expect((await evolucaoDe(item.exercicio.id)).modo).toBe('carga')
  })
})
