/**
 * Referência por série da última vez — FR-194, FR-197.
 *
 * Converte as séries de uma execução anterior no que a tela exibe ao lado de
 * cada série de hoje: repetições e carga, indexadas pelo número da série.
 *
 * É só referência (FR-198). Nada daqui alimenta campo nenhum — o Princípio II
 * proíbe pré-preencher carga entre sessões, e o mesmo vale para repetições.
 */
import type { SerieRealizada } from '../tipos'
import { serieEhValida } from './validade'

export type ReferenciaDeSerie = {
  readonly repeticoes: number
  /** `null` ou `0` = sem carga a mostrar (peso corporal ou não informada). */
  readonly cargaKg: number | null
}

type SerieDeOrigem = Pick<
  SerieRealizada,
  'ordem' | 'repeticoes' | 'cargaKg' | 'naoRealizada' | 'degraus'
>

export function referenciasPorSerie(
  series: readonly SerieDeOrigem[],
): ReadonlyMap<number, ReferenciaDeSerie> {
  const referencias = new Map<number, ReferenciaDeSerie>()

  for (const serie of series) {
    // FR-197: série inexistente, não realizada ou sem repetições não é
    // referência — e a ausência é o sinal, não um "0" enganoso.
    if (!serieEhValida(serie)) continue

    // Em dropset, `repeticoes` guarda a soma dos degraus, que não se compara ao
    // que o usuário vai registrar no primeiro. A referência é o primeiro degrau.
    const primeiroDegrau = serie.degraus?.[0]
    referencias.set(
      serie.ordem,
      primeiroDegrau
        ? { repeticoes: primeiroDegrau.repeticoes, cargaKg: primeiroDegrau.cargaKg }
        : { repeticoes: serie.repeticoes!, cargaKg: serie.cargaKg },
    )
  }

  return referencias
}
