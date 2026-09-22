import { intervaloDe, posicaoNoIntervalo } from './intervalo'
/**
 * Validade de série e comparação planejado x realizado — FR-092, FR-020, FR-019.
 *
 * **Série válida** (FR-092): tem repetições realizadas registradas **e** não
 * está marcada como não realizada. As duas condições, não uma.
 *
 * A definição vive aqui, em função pura, e não no banco: ela é consultada pela
 * avaliação de progressão (FR-043), pelo estado do exercício na sessão (FR-125)
 * e pela busca da execução anterior (FR-094). Três leitores, uma definição.
 */

export type SerieAvaliavel = {
  readonly repeticoes: number | null
  readonly naoRealizada: boolean
}

export function serieEhValida(serie: SerieAvaliavel): boolean {
  return serie.repeticoes !== null && serie.naoRealizada === false
}

export function seriesValidas<T extends SerieAvaliavel>(series: readonly T[]): T[] {
  return series.filter(serieEhValida)
}

export function temAlgumaSerieValida(series: readonly SerieAvaliavel[]): boolean {
  return series.some(serieEhValida)
}

/* ------------------------------------------------------------------ *
 * Comparação planejado x realizado — FR-020, FR-019
 * ------------------------------------------------------------------ */

export type Planejado = {
  /** Mínimo do intervalo de repetições (FR-140). */
  readonly repeticoes: number
  /** Máximo. `null` = ponta única, o comportamento de sempre. */
  readonly repeticoesMax?: number | null
  readonly cargaKg: number
  readonly rir: number | null
}

export type Realizado = {
  readonly repeticoes: number | null
  readonly cargaKg: number | null
  readonly rir: number | null
  readonly naoRealizada: boolean
}

/**
 * `acima`, `igual` e `abaixo` comparam com a meta. `sem_meta` é série extra ou
 * exercício fora do plano; `sem_registro` é o que ainda não foi feito;
 * `nao_realizada` é a recusa explícita, que FR-024 exige distinguir da ausência.
 */
export type Comparacao = 'acima' | 'igual' | 'abaixo' | 'sem_meta' | 'sem_registro' | 'nao_realizada'

export type ComparacaoDaSerie = {
  readonly repeticoes: Comparacao
  readonly carga: Comparacao
  /** RIR planejado e realizado são dados distintos e independentes (FR-019). */
  readonly rir: Comparacao
}

export function compararSerie(
  planejado: Planejado | null,
  realizado: Realizado | null,
): ComparacaoDaSerie {
  if (realizado === null) {
    return { repeticoes: 'sem_registro', carga: 'sem_registro', rir: 'sem_registro' }
  }
  if (realizado.naoRealizada) {
    return { repeticoes: 'nao_realizada', carga: 'nao_realizada', rir: 'nao_realizada' }
  }
  if (planejado === null) {
    return { repeticoes: 'sem_meta', carga: 'sem_meta', rir: 'sem_meta' }
  }

  return {
    // FR-141: com ponta única, "dentro" é o antigo "igual", e as outras duas
    // classificações não mudam.
    repeticoes: compararComIntervalo(realizado.repeticoes, planejado),
    carga: comparar(realizado.cargaKg, planejado.cargaKg),
    // RIR menor significa esforço maior. A comparação aqui é numérica pura —
    // quem interpreta a direção é a avaliação de progressão (FR-044).
    rir: comparar(realizado.rir, planejado.rir),
  }
}

/** FR-141 — abaixo, dentro ou acima do intervalo planejado. */
function compararComIntervalo(realizado: number | null, planejado: Planejado): Comparacao {
  if (realizado === null) return 'sem_registro'

  const intervalo = intervaloDe({
    repeticoes: planejado.repeticoes,
    repeticoesMax: planejado.repeticoesMax ?? null,
  })

  switch (posicaoNoIntervalo(realizado, intervalo)) {
    case 'acima':
      return 'acima'
    case 'abaixo':
      return 'abaixo'
    case 'dentro':
      return 'igual'
  }
}

function comparar(realizado: number | null, planejado: number | null): Comparacao {
  if (realizado === null) return 'sem_registro'
  if (planejado === null) return 'sem_meta'
  if (realizado > planejado) return 'acima'
  if (realizado < planejado) return 'abaixo'
  return 'igual'
}
