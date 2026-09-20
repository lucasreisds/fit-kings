import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { bancoDeTeste, descartar } from '../apoio/banco'
import type { BancoFitKings } from '../../src/dados/db'
import { montarCenario } from '../apoio/cenario'
import { criarRepositorioProgressao } from '../../src/dados/repositorios/progressao'
import type { SeriePlanejadaParaAvaliar } from '../../src/domain/progressao/avaliar'

/**
 * FR-117, SC-030 — corrigidos os valores, a indicação reflete os corrigidos na
 * consulta seguinte, **sem ação do usuário**.
 *
 * Isso não exige rotina de invalidação nenhuma, e é justamente esse o ponto: a
 * indicação nunca foi persistida (Princípio V), então não existe nada gravado
 * para ficar desatualizado. A consulta seguinte lê a versão vigente e pronto.
 */
describe('progressão depois da correção (FR-117)', () => {
  let db: BancoFitKings

  beforeEach(() => {
    db = bancoDeTeste()
  })

  afterEach(async () => {
    await descartar(db)
  })

  const PLANEJADAS: SeriePlanejadaParaAvaliar[] = [
    { ordem: 1, repeticoes: 8, cargaKg: 40, rir: null },
    { ordem: 2, repeticoes: 8, cargaKg: 40, rir: null },
    { ordem: 3, repeticoes: 8, cargaKg: 40, rir: null },
  ]

  async function sessaoConcluida(repeticoes: readonly number[]) {
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

    for (const [indice, reps] of repeticoes.entries()) {
      await cenario.sessoes.registrarSerie(sessao.exercicios[0]!.exercicio.id, {
        ordem: indice + 1,
        cargaKg: 40,
        repeticoes: reps,
        rir: null,
        seriePlanejadaId: null,
      })
    }

    await cenario.sessoes.encerrar(sessao.sessao.id, 'concluir')
    return { cenario, item, sessao: (await cenario.sessoes.obter(sessao.sessao.id))! }
  }

  it('corrigir para cima faz a indicação passar a indicar (SC-030)', async () => {
    // 9/9/7 — a terceira não superou, então não indica.
    const { cenario, item, sessao } = await sessaoConcluida([9, 9, 7])
    const progressao = criarRepositorioProgressao(db)

    const antes = await progressao.indicacaoPara(item.exercicio.id, PLANEJADAS)
    expect(antes.avaliacao.indica).toBe(false)
    expect(antes.avaliacao.motivo).toBe('repeticoes_nao_superadas')

    // O 7 era erro de digitação: foram 9.
    await cenario.sessoes.corrigir(sessao.sessao.id, [
      { serieId: sessao.exercicios[0]!.series[2]!.id, repeticoes: 9 },
    ])

    // Nenhuma ação do usuário além da correção: a consulta seguinte já reflete.
    const depois = await progressao.indicacaoPara(item.exercicio.id, PLANEJADAS)
    expect(depois.avaliacao.indica).toBe(true)
    expect(depois.avaliacao.motivo).toBe('superou_em_todas')
  })

  it('corrigir para baixo faz a indicação deixar de indicar', async () => {
    const { cenario, item, sessao } = await sessaoConcluida([9, 9, 9])
    const progressao = criarRepositorioProgressao(db)

    expect((await progressao.indicacaoPara(item.exercicio.id, PLANEJADAS)).avaliacao.indica).toBe(
      true,
    )

    await cenario.sessoes.corrigir(sessao.sessao.id, [
      { serieId: sessao.exercicios[0]!.series[0]!.id, repeticoes: 8 },
    ])

    const depois = await progressao.indicacaoPara(item.exercicio.id, PLANEJADAS)
    expect(depois.avaliacao.indica).toBe(false)
  })

  it('a indicação usa a versão vigente, não a anterior (FR-114)', async () => {
    const { cenario, item, sessao } = await sessaoConcluida([9, 9, 7])
    const progressao = criarRepositorioProgressao(db)

    await cenario.sessoes.corrigir(sessao.sessao.id, [
      { serieId: sessao.exercicios[0]!.series[2]!.id, repeticoes: 9 },
    ])

    const indicacao = await progressao.indicacaoPara(item.exercicio.id, PLANEJADAS)

    // A versão anterior, com o 7, continua no banco — e é ignorada pela leitura.
    expect(await db.seriesRealizadas.filter((s) => s.repeticoes === 7).count()).toBe(1)
    expect(indicacao.avaliacao.detalhePorSerie.map((d) => d.repeticoesRealizadas)).toEqual([9, 9, 9])
  })

  it('a carga da execução anterior também reflete a correção (FR-083)', async () => {
    const { cenario, item, sessao } = await sessaoConcluida([9, 9, 9])
    const progressao = criarRepositorioProgressao(db)

    expect((await progressao.indicacaoPara(item.exercicio.id, PLANEJADAS)).cargaAnteriorKg).toBe(40)

    await cenario.sessoes.corrigir(sessao.sessao.id, [
      { serieId: sessao.exercicios[0]!.series[2]!.id, cargaKg: 45 },
    ])

    expect((await progressao.indicacaoPara(item.exercicio.id, PLANEJADAS)).cargaAnteriorKg).toBe(45)
  })

  it('exercício sem execução anterior não indica (FR-048)', async () => {
    const cenario = await montarCenario(db)
    const indicacao = await criarRepositorioProgressao(db).indicacaoPara(
      cenario.itens[0]!.exercicio.id,
      PLANEJADAS,
    )

    expect(indicacao.avaliacao.indica).toBe(false)
    expect(indicacao.avaliacao.motivo).toBe('sem_execucao')
    expect(indicacao.baseadaEm).toBeNull()
  })

  it('a indicação aponta a execução que a fundamenta (FR-047)', async () => {
    const { item, sessao } = await sessaoConcluida([9, 9, 9])
    const indicacao = await criarRepositorioProgressao(db).indicacaoPara(
      item.exercicio.id,
      PLANEJADAS,
    )

    expect(indicacao.baseadaEm?.sessaoId).toBe(sessao.sessao.id)
    expect(indicacao.baseadaEm?.concluidaEm).toBe(sessao.sessao.concluidaEm)
  })

  it('nenhum campo de indicação é persistido (Princípio V)', async () => {
    const { item } = await sessaoConcluida([9, 9, 9])
    await criarRepositorioProgressao(db).indicacaoPara(item.exercicio.id, PLANEJADAS)

    // Nenhuma tabela ganhou coluna de indicação, e nenhuma escrita aconteceu.
    const exercicio = await db.exercicios.get(item.exercicio.id)
    expect(exercicio).not.toHaveProperty('indicacao')
    expect(exercicio).not.toHaveProperty('progressao')
    const exercicioSessao = (await db.exerciciosSessao.toArray())[0]
    expect(exercicioSessao).not.toHaveProperty('indicacao')
  })
})
