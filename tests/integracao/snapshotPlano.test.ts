import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { bancoDeTeste, descartar } from '../apoio/banco'
import type { BancoFitKings } from '../../src/dados/db'
import { montarCenario } from '../apoio/cenario'
import { lerPlanoDaSessao } from '../../src/funcionalidades/execucao/iniciarSessao'
import type { SessaoCompleta } from '../../src/dados/repositorios/sessoes'

/**
 * FR-017, Princípio I — a sessão preserva a cópia dos valores planejados
 * vigentes no início, e edição posterior do treino não a alcança.
 *
 * Esta é a versão de integração do portão de teste 2 da constituição. A cópia
 * não é duplicada linha a linha: ela é **reconstruída temporalmente** sobre uma
 * tabela aditiva com exclusão lógica. Uma série planejada já executada nunca é
 * alterada no lugar — editá-la cria uma sucessora e marca a anterior —, e é
 * isso que permite à sessão continuar lendo o plano do dia em que começou.
 */
describe('cópia do plano na sessão (FR-017)', () => {
  let db: BancoFitKings

  beforeEach(() => {
    db = bancoDeTeste()
  })

  afterEach(async () => {
    await descartar(db)
  })

  async function cenarioComSessao() {
    const cenario = await montarCenario(db)
    const item = cenario.itens[0]!

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

    return { cenario, item, sessao }
  }

  function metas(sessao: SessaoCompleta, plano: Awaited<ReturnType<typeof lerPlanoDaSessao>>) {
    return plano.porExercicioSessao.get(sessao.exercicios[0]!.exercicio.id) ?? []
  }

  /** Os repositórios do cenário apontam para o banco isolado deste teste. */
  function colaboradores(cenario: Awaited<ReturnType<typeof montarCenario>>) {
    return { treinos: cenario.treinos, sessoes: cenario.sessoes }
  }

  it('a sessão enxerga o plano vigente no início', async () => {
    const { cenario, sessao } = await cenarioComSessao()
    const plano = await lerPlanoDaSessao(sessao, colaboradores(cenario))

    expect(metas(sessao, plano).map((m) => m.repeticoes)).toEqual([8, 8, 8])
    expect(metas(sessao, plano).map((m) => m.cargaKg)).toEqual([40, 40, 40])
    expect(metas(sessao, plano).map((m) => m.rir)).toEqual([2, 2, 1])
  })

  it('editar os valores planejados depois não altera a sessão (FR-017, SC-013)', async () => {
    const { cenario, item, sessao } = await cenarioComSessao()

    // A sessão já registrou algo: o item passa a ser imutável.
    await cenario.sessoes.registrarSerie(sessao.exercicios[0]!.exercicio.id, {
      ordem: 1,
      cargaKg: 40,
      repeticoes: 9,
      rir: 1,
      seriePlanejadaId: null,
    })

    await cenario.treinos.definirSeries(item.item.item.id, [
      { repeticoes: 12, cargaKg: 60, rir: 0 },
      { repeticoes: 12, cargaKg: 60, rir: 0 },
      { repeticoes: 12, cargaKg: 60, rir: 0 },
    ])

    const plano = await lerPlanoDaSessao(sessao, colaboradores(cenario))

    // O plano da sessão continua sendo o de quando ela começou.
    expect(metas(sessao, plano).map((m) => m.repeticoes)).toEqual([8, 8, 8])
    expect(metas(sessao, plano).map((m) => m.cargaKg)).toEqual([40, 40, 40])

    // E o treino, esse sim, mudou.
    const treinoAgora = await cenario.treinos.obter(cenario.treino.id)
    expect(treinoAgora!.itens[0]!.series.map((s) => s.repeticoes)).toEqual([12, 12, 12])
  })

  it('remover séries do treino depois não encurta o plano da sessão', async () => {
    const { cenario, item, sessao } = await cenarioComSessao()
    await cenario.sessoes.registrarSerie(sessao.exercicios[0]!.exercicio.id, {
      ordem: 1,
      cargaKg: 40,
      repeticoes: 9,
      rir: 1,
      seriePlanejadaId: null,
    })

    await cenario.treinos.definirSeries(item.item.item.id, [{ repeticoes: 8, cargaKg: 40, rir: 2 }])

    const plano = await lerPlanoDaSessao(sessao, colaboradores(cenario))
    expect(metas(sessao, plano)).toHaveLength(3)
  })

  it('excluir o treino inteiro não altera a sessão (FR-040)', async () => {
    const { cenario, sessao } = await cenarioComSessao()
    await cenario.sessoes.registrarSerie(sessao.exercicios[0]!.exercicio.id, {
      ordem: 1,
      cargaKg: 40,
      repeticoes: 9,
      rir: 1,
      seriePlanejadaId: null,
    })

    await cenario.treinos.excluir(cenario.treino.id)

    const recuperada = await cenario.sessoes.obter(sessao.sessao.id)
    expect(recuperada).toBeDefined()
    // O nome do treino é cópia no cabeçalho e sobrevive à exclusão.
    expect(recuperada!.sessao.nomeTreino).toBe('Treino A')
    expect(recuperada!.exercicios[0]!.series).toHaveLength(1)

    const plano = await lerPlanoDaSessao(recuperada!, colaboradores(cenario))
    expect(metas(recuperada!, plano).map((m) => m.repeticoes)).toEqual([8, 8, 8])
  })

  it('uma sessão iniciada depois da edição enxerga o plano novo', async () => {
    const { cenario, item, sessao } = await cenarioComSessao()
    await cenario.sessoes.registrarSerie(sessao.exercicios[0]!.exercicio.id, {
      ordem: 1,
      cargaKg: 40,
      repeticoes: 9,
      rir: 1,
      seriePlanejadaId: null,
    })
    await cenario.sessoes.encerrar(sessao.sessao.id, 'concluir')

    await cenario.treinos.definirSeries(item.item.item.id, [
      { repeticoes: 12, cargaKg: 60, rir: 0 },
    ])

    // Pequena espera para que os carimbos de tempo se distingam.
    await new Promise((resolver) => setTimeout(resolver, 5))

    const nova = await cenario.sessoes.criar({
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

    const plano = await lerPlanoDaSessao(nova, colaboradores(cenario))
    expect(metas(nova, plano).map((m) => m.repeticoes)).toEqual([12])

    // E a sessão antiga continua com o plano dela.
    const antiga = await cenario.sessoes.obter(sessao.sessao.id)
    const planoAntigo = await lerPlanoDaSessao(antiga!, colaboradores(cenario))
    expect(metas(antiga!, planoAntigo).map((m) => m.repeticoes)).toEqual([8, 8, 8])
  })

  it('exercício fora do plano não tem meta (FR-088, FR-089)', async () => {
    const { cenario, sessao } = await cenarioComSessao()
    const extra = await cenario.exercicios.criar({ nome: 'Rosca martelo', origem: 'catalogo' })
    await cenario.sessoes.acrescentarExercicio(sessao.sessao.id, {
      exercicioId: extra.id,
      abordagem: 'tradicional',
      origem: 'fora_do_plano',
      itemTreinoId: null,
    })

    const recuperada = await cenario.sessoes.obter(sessao.sessao.id)
    const plano = await lerPlanoDaSessao(recuperada!, colaboradores(cenario))
    const foraDoPlano = recuperada!.exercicios.find((e) => e.exercicio.origem === 'fora_do_plano')!

    expect(plano.porExercicioSessao.get(foraDoPlano.exercicio.id)).toEqual([])
  })

  it('o item nunca executado é editado no lugar, sem gerar geração nova', async () => {
    const cenario = await montarCenario(db)
    const item = cenario.itens[0]!

    const antes = await db.seriesPlanejadas.count()
    await cenario.treinos.definirSeries(item.item.item.id, [
      { repeticoes: 10, cargaKg: 45, rir: 1 },
      { repeticoes: 10, cargaKg: 45, rir: 1 },
      { repeticoes: 10, cargaKg: 45, rir: 1 },
    ])

    // Sem sessão referenciando, não há a quem mentir: nada é duplicado.
    expect(await db.seriesPlanejadas.count()).toBe(antes)
  })
})
