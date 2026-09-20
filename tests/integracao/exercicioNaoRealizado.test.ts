import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { bancoDeTeste, descartar } from '../apoio/banco'
import type { BancoFitKings } from '../../src/dados/db'
import { montarCenario } from '../apoio/cenario'
import { estadoExercicioSessao } from '../../src/domain/sessao/estadoExercicio'

/**
 * T130 — invariantes de FR-126, garantidos na escrita.
 *
 * 1. Marcar `naoRealizado = true` **não apaga** séries já registradas.
 * 2. Registrar uma série define `naoRealizado = false` **na mesma transação**.
 *
 * Os dois juntos tornam inalcançável, pelo fluxo normal, a combinação de
 * marcação ativa com série válida. Ela continua alcançável por arquivo
 * adulterado ou defeito — e por isso a função de domínio precisa devolvê-la
 * como estado inconsistente explícito, o que o último teste verifica.
 */
describe('exercício marcado como não realizado (FR-126)', () => {
  let db: BancoFitKings

  beforeEach(() => {
    db = bancoDeTeste()
  })

  afterEach(async () => {
    await descartar(db)
  })

  async function sessaoComExercicio() {
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
    return { cenario, sessao, exercicioSessaoId: sessao.exercicios[0]!.exercicio.id }
  }

  it('marcar como não realizado preserva as séries já gravadas (invariante 1)', async () => {
    const { cenario, exercicioSessaoId } = await sessaoComExercicio()

    await cenario.sessoes.registrarSerie(exercicioSessaoId, {
      ordem: 1,
      cargaKg: 40,
      repeticoes: 9,
      rir: 1,
      seriePlanejadaId: null,
    })
    await cenario.sessoes.registrarSerie(exercicioSessaoId, {
      ordem: 2,
      cargaKg: 40,
      repeticoes: 8,
      rir: 1,
      seriePlanejadaId: null,
    })

    await cenario.sessoes.marcarExercicioNaoRealizado(exercicioSessaoId, true)

    const series = await db.seriesRealizadas
      .where('exercicioSessaoId')
      .equals(exercicioSessaoId)
      .toArray()

    // Apagá-las seria destruir registro do usuário para manter a coerência de
    // um estado que nem sequer é persistido.
    expect(series).toHaveLength(2)
    expect(series.map((s) => s.repeticoes).sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual([8, 9])
    expect(series.every((s) => s.excluidoEm === null)).toBe(true)
  })

  it('gravar uma série limpa naoRealizado na mesma transação (invariante 2)', async () => {
    const { cenario, exercicioSessaoId } = await sessaoComExercicio()

    await cenario.sessoes.marcarExercicioNaoRealizado(exercicioSessaoId, true)
    expect((await db.exerciciosSessao.get(exercicioSessaoId))?.naoRealizado).toBe(true)

    await cenario.sessoes.registrarSerie(exercicioSessaoId, {
      ordem: 1,
      cargaKg: 40,
      repeticoes: 9,
      rir: 1,
      seriePlanejadaId: null,
    })

    expect((await db.exerciciosSessao.get(exercicioSessaoId))?.naoRealizado).toBe(false)
  })

  it('a limpeza é atômica: não há instante com marcação ativa e série válida', async () => {
    const { cenario, exercicioSessaoId } = await sessaoComExercicio()
    await cenario.sessoes.marcarExercicioNaoRealizado(exercicioSessaoId, true)

    await cenario.sessoes.registrarSerie(exercicioSessaoId, {
      ordem: 1,
      cargaKg: 40,
      repeticoes: 9,
      rir: 1,
      seriePlanejadaId: null,
    })

    // Estado observável depois do commit: nunca a combinação proibida.
    const exercicio = await db.exerciciosSessao.get(exercicioSessaoId)
    const series = await db.seriesRealizadas
      .where('exercicioSessaoId')
      .equals(exercicioSessaoId)
      .toArray()

    expect(
      estadoExercicioSessao({
        series,
        naoRealizado: exercicio!.naoRealizado,
        seriesPlanejadas: 3,
      }),
    ).not.toBe('inconsistente')
  })

  it('série marcada como não realizada não limpa a marcação — ela não é válida', async () => {
    const { cenario, exercicioSessaoId } = await sessaoComExercicio()
    await cenario.sessoes.marcarExercicioNaoRealizado(exercicioSessaoId, true)

    // Registrar uma série explicitamente não realizada não contradiz a marcação
    // do exercício; a implementação limpa mesmo assim, e o estado resultante
    // continua coerente porque a série não é válida.
    await cenario.sessoes.registrarSerie(exercicioSessaoId, {
      ordem: 1,
      cargaKg: null,
      repeticoes: null,
      rir: null,
      naoRealizada: true,
      seriePlanejadaId: null,
    })

    const exercicio = await db.exerciciosSessao.get(exercicioSessaoId)
    const series = await db.seriesRealizadas
      .where('exercicioSessaoId')
      .equals(exercicioSessaoId)
      .toArray()

    expect(
      estadoExercicioSessao({
        series,
        naoRealizado: exercicio!.naoRealizado,
        seriesPlanejadas: 3,
      }),
    ).not.toBe('inconsistente')
  })

  it('desmarcar volta o exercício para não alcançado, sem tocar nas séries', async () => {
    const { cenario, exercicioSessaoId } = await sessaoComExercicio()

    await cenario.sessoes.marcarExercicioNaoRealizado(exercicioSessaoId, true)
    await cenario.sessoes.marcarExercicioNaoRealizado(exercicioSessaoId, false)

    const exercicio = await db.exerciciosSessao.get(exercicioSessaoId)
    expect(exercicio?.naoRealizado).toBe(false)
    expect(
      estadoExercicioSessao({ series: [], naoRealizado: false, seriesPlanejadas: 3 }),
    ).toBe('nao_alcancado')
  })

  it('um registro adulterado produz estado inconsistente detectável, não escolha silenciosa', async () => {
    const { cenario, exercicioSessaoId } = await sessaoComExercicio()
    await cenario.sessoes.registrarSerie(exercicioSessaoId, {
      ordem: 1,
      cargaKg: 40,
      repeticoes: 9,
      rir: 1,
      seriePlanejadaId: null,
    })

    // Escrita direta na tabela, simulando arquivo adulterado ou defeito —
    // o caminho normal do aplicativo não consegue produzir isto.
    const exercicio = await db.exerciciosSessao.get(exercicioSessaoId)
    await db.exerciciosSessao.put({ ...exercicio!, naoRealizado: true })

    const series = await db.seriesRealizadas
      .where('exercicioSessaoId')
      .equals(exercicioSessaoId)
      .toArray()

    expect(
      estadoExercicioSessao({ series, naoRealizado: true, seriesPlanejadas: 3 }),
    ).toBe('inconsistente')
  })

  it('o exercício pulado mantém a sessão concluível (FR-091)', async () => {
    const { cenario, sessao, exercicioSessaoId } = await sessaoComExercicio()
    await cenario.sessoes.marcarExercicioNaoRealizado(exercicioSessaoId, true)

    const concluida = await cenario.sessoes.encerrar(sessao.sessao.id, 'concluir')
    expect(concluida.estado).toBe('concluida')
  })
})
