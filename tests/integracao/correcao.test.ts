import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { bancoDeTeste, descartar } from '../apoio/banco'
import type { BancoFitKings } from '../../src/dados/db'
import { montarCenario } from '../apoio/cenario'
import { CorrecaoInvalidaError, SessaoNaoCorrigivelError } from '../../src/dados/repositorios/sessoes'
import { criarRepositorioHistorico } from '../../src/dados/repositorios/historico'

/**
 * FR-114, FR-115, SC-029 — a correção cria versão nova, preserva a anterior e
 * não mexe na posição cronológica.
 *
 * O Princípio I é categórico: nenhuma operação sobrescreve, mescla ou remove
 * uma sessão concluída. Corrigir um erro de digitação é permitido justamente
 * porque **não** é nenhuma dessas três coisas.
 */
describe('correção de sessão concluída', () => {
  let db: BancoFitKings

  beforeEach(() => {
    db = bancoDeTeste()
  })

  afterEach(async () => {
    await descartar(db)
  })

  async function sessaoConcluida() {
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

    const exercicioSessaoId = sessao.exercicios[0]!.exercicio.id
    for (const [ordem, repeticoes] of [
      [1, 8],
      [2, 8],
      [3, 7],
    ] as const) {
      await cenario.sessoes.registrarSerie(exercicioSessaoId, {
        ordem,
        cargaKg: 40,
        repeticoes,
        rir: 1,
        seriePlanejadaId: null,
      })
    }

    await cenario.sessoes.encerrar(sessao.sessao.id, 'concluir')
    const concluida = await cenario.sessoes.obter(sessao.sessao.id)
    return { cenario, item, sessao: concluida! }
  }

  it('cria versão nova e preserva integralmente a anterior (FR-114)', async () => {
    const { cenario, sessao } = await sessaoConcluida()
    const serieErrada = sessao.exercicios[0]!.series[2]!
    const versaoOriginal = sessao.versao

    const corrigida = await cenario.sessoes.corrigir(sessao.sessao.id, [
      { serieId: serieErrada.id, repeticoes: 9 },
    ])

    expect(corrigida.versao.id).not.toBe(versaoOriginal.id)
    expect(corrigida.versao.numero).toBe(2)
    expect(corrigida.versao.motivo).toBe('correcao')
    expect(corrigida.sessao.corrigida).toBe(true)

    // A versão anterior continua existindo, intacta.
    const versoes = await cenario.sessoes.versoesDe(sessao.sessao.id)
    expect(versoes).toHaveLength(2)
    expect(versoes[0]!.id).toBe(versaoOriginal.id)
    expect(versoes[0]!.motivo).toBe('inicial')
    expect(versoes[0]!.excluidoEm).toBeNull()

    // E as séries dela também.
    const seriesAntigas = await db.seriesRealizadas
      .where('exercicioSessaoId')
      .equals(sessao.exercicios[0]!.exercicio.id)
      .toArray()
    expect(seriesAntigas.map((s) => s.repeticoes).sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual([7, 8, 8])
  })

  it('a leitura passa a usar a versão vigente (FR-114)', async () => {
    const { cenario, sessao } = await sessaoConcluida()
    const serieErrada = sessao.exercicios[0]!.series[2]!

    await cenario.sessoes.corrigir(sessao.sessao.id, [{ serieId: serieErrada.id, repeticoes: 9 }])

    const lida = await cenario.sessoes.obter(sessao.sessao.id)
    expect(lida!.exercicios[0]!.series.map((s) => s.repeticoes)).toEqual([8, 8, 9])
    expect(lida!.versao.numero).toBe(2)
    expect(lida!.versao.vigente).toBe(1)
  })

  it('não altera iniciadaEm, concluidaEm nem a ordem cronológica (FR-115, SC-029)', async () => {
    const { cenario, sessao } = await sessaoConcluida()
    const antes = sessao.sessao

    const corrigida = await cenario.sessoes.corrigir(sessao.sessao.id, [
      { serieId: sessao.exercicios[0]!.series[0]!.id, cargaKg: 42.5 },
    ])

    expect(corrigida.sessao.iniciadaEm).toBe(antes.iniciadaEm)
    expect(corrigida.sessao.concluidaEm).toBe(antes.concluidaEm)
    expect(corrigida.sessao.estado).toBe('concluida')

    // A posição no histórico é a mesma.
    const historico = await criarRepositorioHistorico(db).listarSessoes()
    expect(historico[0]!.sessao.id).toBe(antes.id)
    expect(historico[0]!.sessao.concluidaEm).toBe(antes.concluidaEm)
  })

  it('registra a data da última alteração na versão vigente (FR-116)', async () => {
    const { cenario, sessao } = await sessaoConcluida()
    const antes = sessao.sessao.alteradoEm

    await new Promise((resolver) => setTimeout(resolver, 5))
    const corrigida = await cenario.sessoes.corrigir(sessao.sessao.id, [
      { serieId: sessao.exercicios[0]!.series[0]!.id, cargaKg: 45 },
    ])

    expect(Date.parse(corrigida.sessao.alteradoEm)).toBeGreaterThan(Date.parse(antes))
    expect(corrigida.sessao.corrigida).toBe(true)
  })

  it('corrige os três campos e só eles (FR-112)', async () => {
    const { cenario, sessao } = await sessaoConcluida()
    const serie = sessao.exercicios[0]!.series[0]!

    const corrigida = await cenario.sessoes.corrigir(sessao.sessao.id, [
      { serieId: serie.id, cargaKg: 45, repeticoes: 10, rir: 0 },
    ])

    const nova = corrigida.exercicios[0]!.series[0]!
    expect(nova.cargaKg).toBe(45)
    expect(nova.repeticoes).toBe(10)
    expect(nova.rir).toBe(0)
    // O que não é corrigível atravessa intacto.
    expect(nova.ordem).toBe(serie.ordem)
    expect(nova.naoRealizada).toBe(serie.naoRealizada)
    expect(nova.seriePlanejadaId).toBe(serie.seriePlanejadaId)
  })

  it('recusa acrescentar série por meio da correção (FR-113)', async () => {
    const { cenario, sessao } = await sessaoConcluida()

    await expect(
      cenario.sessoes.corrigir(sessao.sessao.id, [
        { serieId: '11111111-1111-4111-8111-111111111111', repeticoes: 12 },
      ]),
    ).rejects.toThrow(CorrecaoInvalidaError)

    // Nada foi gravado: a sessão continua com uma versão só.
    expect(await cenario.sessoes.versoesDe(sessao.sessao.id)).toHaveLength(1)
  })

  it('a correção preserva a quantidade de séries e de exercícios (FR-113)', async () => {
    const { cenario, sessao } = await sessaoConcluida()

    const corrigida = await cenario.sessoes.corrigir(sessao.sessao.id, [
      { serieId: sessao.exercicios[0]!.series[0]!.id, repeticoes: 9 },
    ])

    expect(corrigida.exercicios).toHaveLength(sessao.exercicios.length)
    expect(corrigida.exercicios[0]!.series).toHaveLength(sessao.exercicios[0]!.series.length)
    expect(corrigida.exercicios[0]!.exercicio.abordagem).toBe(
      sessao.exercicios[0]!.exercicio.abordagem,
    )
  })

  it('recusa correção que não altera nada', async () => {
    const { cenario, sessao } = await sessaoConcluida()
    const serie = sessao.exercicios[0]!.series[0]!

    await expect(
      cenario.sessoes.corrigir(sessao.sessao.id, [
        { serieId: serie.id, repeticoes: serie.repeticoes },
      ]),
    ).rejects.toThrow(CorrecaoInvalidaError)
  })

  it.each([
    ['repetições negativas', { repeticoes: -1 }],
    ['carga negativa', { cargaKg: -5 }],
    ['RIR fracionado', { rir: 1.5 }],
  ])('recusa %s', async (_caso, valores) => {
    const { cenario, sessao } = await sessaoConcluida()
    await expect(
      cenario.sessoes.corrigir(sessao.sessao.id, [
        { serieId: sessao.exercicios[0]!.series[0]!.id, ...valores },
      ]),
    ).rejects.toThrow(CorrecaoInvalidaError)
  })

  it('recusa corrigir sessão que não está concluída', async () => {
    const cenario = await montarCenario(db)
    const sessao = await cenario.sessoes.criar({
      treinoId: cenario.treino.id,
      nomeTreino: 'Treino A',
      exercicios: [],
    })

    await expect(cenario.sessoes.corrigir(sessao.sessao.id, [])).rejects.toThrow(
      SessaoNaoCorrigivelError,
    )
  })

  it('duas correções sucessivas produzem três versões, todas preservadas', async () => {
    const { cenario, sessao } = await sessaoConcluida()

    const primeira = await cenario.sessoes.corrigir(sessao.sessao.id, [
      { serieId: sessao.exercicios[0]!.series[0]!.id, repeticoes: 9 },
    ])
    await cenario.sessoes.corrigir(sessao.sessao.id, [
      { serieId: primeira.exercicios[0]!.series[1]!.id, repeticoes: 10 },
    ])

    const versoes = await cenario.sessoes.versoesDe(sessao.sessao.id)
    expect(versoes.map((v) => v.numero)).toEqual([1, 2, 3])
    expect(versoes.filter((v) => v.vigente === 1)).toHaveLength(1)
    expect(versoes.find((v) => v.vigente === 1)!.numero).toBe(3)

    const lida = await cenario.sessoes.obter(sessao.sessao.id)
    expect(lida!.exercicios[0]!.series.map((s) => s.repeticoes)).toEqual([9, 10, 7])
  })
})
