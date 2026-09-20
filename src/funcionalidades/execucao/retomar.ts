/**
 * Retomada da sessão — FR-032, FR-034.
 *
 * "Retomar exatamente no ponto em que parou" é, aqui, uma **derivação**, não um
 * ponteiro guardado. O ponto de parada é o primeiro exercício que ainda tem
 * série planejada por registrar; se não houver nenhum, é o último que foi
 * tocado. Guardar um índice de "exercício corrente" criaria um cache que o
 * Princípio V proíbe — e que ficaria errado assim que uma série fosse
 * registrada fora de ordem.
 */
import type { Id } from '../../domain/tipos'
import type { SessaoCompleta } from '../../dados/repositorios/sessoes'
import type { PlanoDaSessao } from './iniciarSessao'
import { seriesValidas } from '../../domain/serie/validade'
import { estadoExercicioSessao } from '../../domain/sessao/estadoExercicio'
import { diferencaMs, UM_DIA_MS, type InstanteUtc } from '../../plataforma/tempo'

/** Depois disto, a sessão é tratada como abandonada (caso de borda da spec). */
export const HORAS_ATE_ABANDONO = 12

export type PontoDeRetomada = {
  readonly exercicioSessaoId: Id | null
  readonly proximaSerie: number
  readonly seriesRegistradas: number
  readonly seriesPlanejadas: number
}

export function pontoDeRetomada(
  sessao: SessaoCompleta,
  plano: PlanoDaSessao,
): PontoDeRetomada {
  let seriesRegistradas = 0
  let seriesPlanejadas = 0
  let candidato: PontoDeRetomada | null = null

  for (const item of sessao.exercicios) {
    const metas = plano.porExercicioSessao.get(item.exercicio.id) ?? []
    const validas = seriesValidas(item.series).length

    seriesRegistradas += item.series.length
    seriesPlanejadas += metas.length

    if (candidato !== null) continue

    const estado = estadoExercicioSessao({
      series: item.series,
      naoRealizado: item.exercicio.naoRealizado,
      seriesPlanejadas: metas.length,
    })

    // Um exercício pulado de propósito não é ponto de parada: o usuário já
    // decidiu sobre ele.
    if (estado === 'nao_realizado') continue
    if (metas.length > 0 && validas >= metas.length) continue

    candidato = {
      exercicioSessaoId: item.exercicio.id,
      proximaSerie: item.series.length + 1,
      seriesRegistradas: 0,
      seriesPlanejadas: 0,
    }
  }

  const ultimo = sessao.exercicios[sessao.exercicios.length - 1]

  return {
    exercicioSessaoId: candidato?.exercicioSessaoId ?? ultimo?.exercicio.id ?? null,
    proximaSerie: candidato?.proximaSerie ?? (ultimo ? ultimo.series.length + 1 : 1),
    seriesRegistradas,
    seriesPlanejadas,
  }
}

/** A sessão ficou aberta tempo demais para ser a de agora? */
export function pareceAbandonada(
  sessao: SessaoCompleta,
  agora: InstanteUtc,
  horas = HORAS_ATE_ABANDONO,
): boolean {
  return diferencaMs(sessao.sessao.iniciadaEm, agora) > (horas / 24) * UM_DIA_MS
}
