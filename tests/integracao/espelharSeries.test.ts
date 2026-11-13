import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { bancoDeTeste, descartar } from '../apoio/banco'
import type { BancoFitKings } from '../../src/dados/db'
import { montarCenario } from '../apoio/cenario'
import { espelhar } from '../../src/domain/treino'
import { lerPlanoDaSessao } from '../../src/funcionalidades/execucao/iniciarSessao'
import { projetarSeriesPlanejadas } from '../../src/funcionalidades/treinos/projecaoDeSeries'

/**
 * T003 — FR-191, FR-193.
 *
 * O espelhamento passa pelo mesmo `transformarSeries` que o editor usa: a regra
 * roda sobre o gravado, dentro da transação, e todas as séries mudam juntas. O
 * cenário parte de 3x8 com RIR 2 / 2 / 1 — a série 3 já nasce diferente da
 * primeira e é a testemunha de que só as iguais acompanham.
 */
describe('espelhamento gravado (FR-191, FR-193)', () => {
  let db: BancoFitKings

  beforeEach(() => {
    db = bancoDeTeste()
  })

  afterEach(async () => {
    await descartar(db)
  })

  it('grava as séries que acompanham a primeira, e só elas', async () => {
    const cenario = await montarCenario(db)
    const item = cenario.itens[0]!.item.item

    await cenario.treinos.transformarSeries(item.id, (gravadas) =>
      espelhar(projetarSeriesPlanejadas(gravadas), 0, 'cargaKg', 50),
    )

    const relido = await cenario.treinos.obter(cenario.treino.id)
    expect(relido!.itens[0]!.series.map((s) => s.cargaKg)).toEqual([50, 50, 40])
  })

  it('a sessão já iniciada continua com o plano do dia em que começou (FR-193)', async () => {
    const cenario = await montarCenario(db)
    const { exercicio, item } = cenario.itens[0]!
    const sessao = await cenario.sessoes.criar({
      treinoId: cenario.treino.id,
      nomeTreino: cenario.treino.nome,
      exercicios: [
        {
          exercicioId: exercicio.id,
          ordem: 1,
          abordagem: 'tradicional',
          origem: 'planejado',
          itemTreinoId: item.item.id,
        },
      ],
    })
    await cenario.sessoes.registrarSerie(sessao.exercicios[0]!.exercicio.id, {
      ordem: 1,
      cargaKg: 40,
      repeticoes: 8,
      rir: 2,
      seriePlanejadaId: null,
    })

    await cenario.treinos.transformarSeries(item.item.id, (gravadas) =>
      espelhar(projetarSeriesPlanejadas(gravadas), 0, 'cargaKg', 50),
    )

    const plano = await lerPlanoDaSessao(sessao, {
      treinos: cenario.treinos,
      sessoes: cenario.sessoes,
    })
    const metas = plano.porExercicioSessao.get(sessao.exercicios[0]!.exercicio.id) ?? []
    expect(metas.map((m) => m.cargaKg)).toEqual([40, 40, 40])
  })
})
