import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { bancoDeTeste, descartar } from '../apoio/banco'
import type { BancoFitKings } from '../../src/dados/db'
import { montarCenario, TRES_POR_OITO } from '../apoio/cenario'
import { SessaoNaoEstaEmAndamentoError } from '../../src/dados/repositorios/sessoes'
import { estadoExercicioSessao } from '../../src/domain/sessao/estadoExercicio'

/**
 * T014 a T017 — FR-133 a FR-136.
 *
 * A fronteira que estes testes travam é a mais importante da feature: o que
 * abre para a sessão **em andamento** continua fechado para a **concluída**.
 * FR-113 e FR-114 seguem intactos, e a verificação vive na camada de dados —
 * uma tela pode esquecer de checar; o repositório, não.
 */
describe('correção e remoção em sessão em andamento', () => {
  let db: BancoFitKings

  beforeEach(() => {
    db = bancoDeTeste()
  })

  afterEach(async () => {
    await descartar(db)
  })

  async function sessaoComTresSeries() {
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
    const planejadas = item.item.series
    for (const [indice, reps] of [8, 9, 10].entries()) {
      await cenario.sessoes.registrarSerie(exercicioSessaoId, {
        ordem: indice + 1,
        cargaKg: 40,
        repeticoes: reps,
        rir: 1,
        seriePlanejadaId: planejadas[indice]?.id ?? null,
      })
    }

    return { cenario, item, sessao, exercicioSessaoId }
  }

  async function seriesDe(exercicioSessaoId: string) {
    return (await db.seriesRealizadas.where('exercicioSessaoId').equals(exercicioSessaoId).toArray())
      .filter((serie) => serie.excluidoEm === null)
      .sort((a, b) => a.ordem - b.ordem)
  }

  it('corrige valores sem criar versão nova (FR-133, FR-136)', async () => {
    const { cenario, sessao, exercicioSessaoId } = await sessaoComTresSeries()
    const antes = await seriesDe(exercicioSessaoId)

    await cenario.sessoes.corrigirSerieEmAndamento(antes[0]!.id, { repeticoes: 12, cargaKg: 45 })

    const depois = await seriesDe(exercicioSessaoId)
    expect(depois[0]!.repeticoes).toBe(12)
    expect(depois[0]!.cargaKg).toBe(45)

    // Nenhuma versão nova: a sessão em andamento é rascunho, não histórico.
    expect(await cenario.sessoes.versoesDe(sessao.sessao.id)).toHaveLength(1)
    expect((await db.sessoes.get(sessao.sessao.id))?.corrigida).toBe(false)
  })

  it('remove logicamente, sem apagar a linha (FR-134)', async () => {
    const { cenario, exercicioSessaoId } = await sessaoComTresSeries()
    const antes = await seriesDe(exercicioSessaoId)
    const totalNaTabela = await db.seriesRealizadas.count()

    await cenario.sessoes.removerSerieEmAndamento(antes[1]!.id)

    // Some da leitura corrente…
    expect(await seriesDe(exercicioSessaoId)).toHaveLength(2)
    // …mas a linha permanece, carimbada.
    expect(await db.seriesRealizadas.count()).toBe(totalNaTabela)
    expect((await db.seriesRealizadas.get(antes[1]!.id))?.excluidoEm).not.toBeNull()
  })

  it('renumera e re-vincula as restantes à meta da nova posição (FR-135)', async () => {
    const { cenario, item, exercicioSessaoId } = await sessaoComTresSeries()
    const antes = await seriesDe(exercicioSessaoId)
    const planejadas = item.item.series

    await cenario.sessoes.removerSerieEmAndamento(antes[1]!.id)

    const depois = await seriesDe(exercicioSessaoId)
    expect(depois.map((s) => s.ordem)).toEqual([1, 2])
    expect(depois.map((s) => s.repeticoes)).toEqual([8, 10])
    // A que era a terceira passa a cumprir a segunda meta.
    expect(depois[1]!.seriePlanejadaId).toBe(planejadas[1]!.id)
  })

  it('é recusada em sessão concluída — FR-113 e FR-114 continuam valendo', async () => {
    const { cenario, sessao, exercicioSessaoId } = await sessaoComTresSeries()
    const series = await seriesDe(exercicioSessaoId)
    await cenario.sessoes.encerrar(sessao.sessao.id, 'concluir')

    await expect(
      cenario.sessoes.corrigirSerieEmAndamento(series[0]!.id, { repeticoes: 99 }),
    ).rejects.toThrow(SessaoNaoEstaEmAndamentoError)

    await expect(cenario.sessoes.removerSerieEmAndamento(series[0]!.id)).rejects.toThrow(
      SessaoNaoEstaEmAndamentoError,
    )

    // Nada mudou: a recusa não pode ter efeito colateral.
    expect((await seriesDe(exercicioSessaoId)).map((s) => s.repeticoes)).toEqual([8, 9, 10])
  })

  it('é recusada em sessão descartada', async () => {
    const { cenario, sessao, exercicioSessaoId } = await sessaoComTresSeries()
    const series = await seriesDe(exercicioSessaoId)
    await cenario.sessoes.encerrar(sessao.sessao.id, 'descartar')

    await expect(cenario.sessoes.removerSerieEmAndamento(series[0]!.id)).rejects.toThrow(
      SessaoNaoEstaEmAndamentoError,
    )
  })

  it('remover todas devolve o exercício a não alcançado, não a não realizado (FR-125)', async () => {
    const { cenario, exercicioSessaoId } = await sessaoComTresSeries()
    for (const serie of await seriesDe(exercicioSessaoId)) {
      await cenario.sessoes.removerSerieEmAndamento(serie.id)
    }

    const exercicio = await db.exerciciosSessao.get(exercicioSessaoId)
    const estado = estadoExercicioSessao({
      series: await seriesDe(exercicioSessaoId),
      naoRealizado: exercicio!.naoRealizado,
      seriesPlanejadas: TRES_POR_OITO.length,
    })

    // A distinção importa: "não alcançado" é a sessão ainda não ter chegado
    // ali; "não realizado" é a intenção do usuário de pular.
    expect(estado).toBe('nao_alcancado')
    expect(exercicio!.naoRealizado).toBe(false)
  })

  it('corrigir para um valor válido limpa a marcação de não realizado (FR-126)', async () => {
    const { cenario, exercicioSessaoId } = await sessaoComTresSeries()
    const series = await seriesDe(exercicioSessaoId)

    await cenario.sessoes.marcarExercicioNaoRealizado(exercicioSessaoId, true)
    await cenario.sessoes.corrigirSerieEmAndamento(series[0]!.id, { repeticoes: 11 })

    expect((await db.exerciciosSessao.get(exercicioSessaoId))?.naoRealizado).toBe(false)
  })

  it('recusa valor fora do domínio sem alterar nada', async () => {
    const { cenario, exercicioSessaoId } = await sessaoComTresSeries()
    const series = await seriesDe(exercicioSessaoId)

    await expect(
      cenario.sessoes.corrigirSerieEmAndamento(series[0]!.id, { repeticoes: -3 }),
    ).rejects.toThrow()

    expect((await seriesDe(exercicioSessaoId))[0]!.repeticoes).toBe(8)
  })
})
