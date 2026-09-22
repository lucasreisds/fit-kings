/**
 * Intervalo de repetições planejadas — FR-139 a FR-143, D1.
 *
 * **O valor único é um intervalo de pontas coincidentes**, e não um caso
 * paralelo. Essa escolha é o que impede a feature de criar um segundo caminho
 * de avaliação: toda comparação usa `maximo`, e para uma série planejada
 * antiga `maximo === repeticoes`, de modo que a expressão é idêntica à que
 * existia antes.
 *
 * É por isso que os dez casos de fronteira do portão 4 continuam valendo sem
 * alteração (SC-040) — e é por isso que eles são o alarme desta feature: se um
 * único mudar de resultado, a generalização quebrou o que já funcionava.
 */

/** A forma que as regras consomem, resolvida a partir do registro. */
export type IntervaloDeRepeticoes = {
  readonly minimo: number
  readonly maximo: number
}

export type PlanejamentoDeRepeticoes = {
  readonly repeticoes: number
  readonly repeticoesMax: number | null
}

/**
 * Resolve o intervalo. `repeticoesMax` nulo significa ponta única — o
 * comportamento de sempre e o estado de todo registro anterior à feature 002.
 */
export function intervaloDe(planejado: PlanejamentoDeRepeticoes): IntervaloDeRepeticoes {
  return {
    minimo: planejado.repeticoes,
    maximo: planejado.repeticoesMax ?? planejado.repeticoes,
  }
}

export function ehPontaUnica(intervalo: IntervaloDeRepeticoes): boolean {
  return intervalo.minimo === intervalo.maximo
}

/** Classificação de FR-141. */
export type PosicaoNoIntervalo = 'abaixo' | 'dentro' | 'acima'

export function posicaoNoIntervalo(
  realizado: number,
  intervalo: IntervaloDeRepeticoes,
): PosicaoNoIntervalo {
  if (realizado < intervalo.minimo) return 'abaixo'
  if (realizado > intervalo.maximo) return 'acima'
  return 'dentro'
}

/**
 * FR-142 — o critério de aumento de carga.
 *
 * Superar é fazer **estritamente mais que o máximo**. Com ponta única isso é
 * "estritamente maior que o planejado", que é literalmente FR-043 e FR-081 como
 * já estavam. Ficar no topo do intervalo é cumprir a meta, não superá-la.
 */
export function superouIntervalo(realizado: number, intervalo: IntervaloDeRepeticoes): boolean {
  return realizado > intervalo.maximo
}

/** Texto do intervalo: `8` para ponta única, `6-8` para faixa. */
export function formatarIntervalo(intervalo: IntervaloDeRepeticoes): string {
  return ehPontaUnica(intervalo) ? `${intervalo.minimo}` : `${intervalo.minimo}-${intervalo.maximo}`
}

export type ProblemaDoIntervalo = { readonly campo: string; readonly mensagem: string }

/** FR-143 — mínimo maior que máximo é recusado; pontas iguais são aceitas. */
export function validarIntervalo(
  planejado: PlanejamentoDeRepeticoes,
): readonly ProblemaDoIntervalo[] {
  const problemas: ProblemaDoIntervalo[] = []

  if (!Number.isInteger(planejado.repeticoes) || planejado.repeticoes < 1) {
    problemas.push({
      campo: 'repeticoes',
      mensagem: 'As repetições planejadas são um número inteiro maior que zero.',
    })
  }

  if (planejado.repeticoesMax !== null) {
    if (!Number.isInteger(planejado.repeticoesMax) || planejado.repeticoesMax < 1) {
      problemas.push({
        campo: 'repeticoesMax',
        mensagem: 'O máximo do intervalo é um número inteiro maior que zero.',
      })
    } else if (planejado.repeticoesMax < planejado.repeticoes) {
      problemas.push({
        campo: 'repeticoesMax',
        mensagem: 'O máximo do intervalo não pode ser menor que o mínimo.',
      })
    }
  }

  return problemas
}
