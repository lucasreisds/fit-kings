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

/**
 * Classificação de FR-141 e FR-164.
 *
 * `no_topo` existe apenas em faixas, e não é preciosismo: com o gatilho de
 * FR-160, alcançar o máximo de uma faixa é o que dispara o aviso de aumento de
 * carga. Apresentá-lo como "dentro", igual a ter feito o mínimo, deixaria o
 * usuário vendo o aviso sem conseguir ligá-lo ao que fez — e o Princípio V
 * exige que ele consiga consultar o que fundamenta qualquer indicação.
 */
export type PosicaoNoIntervalo = 'abaixo' | 'dentro' | 'no_topo' | 'acima'

export function posicaoNoIntervalo(
  realizado: number,
  intervalo: IntervaloDeRepeticoes,
): PosicaoNoIntervalo {
  if (realizado < intervalo.minimo) return 'abaixo'
  if (realizado > intervalo.maximo) return 'acima'
  // Em ponta única não há topo a alcançar que não seja o próprio valor: dizer
  // "no topo" ali seria inventar uma distinção que a prescrição não faz.
  if (!ehPontaUnica(intervalo) && realizado === intervalo.maximo) return 'no_topo'
  return 'dentro'
}

/**
 * O critério de aumento de carga — FR-160, FR-161, FR-162.
 *
 * **O gatilho depende da forma da prescrição**, e isso não é inconsistência:
 * faixa e valor único não são a mesma coisa escrita de jeitos diferentes.
 *
 * - Numa **faixa** `6-8`, o máximo é a **meta a alcançar**. "Trabalhe entre 6 e
 *   8" significa que dominar o 8 é o objetivo, e alcançá-lo é a conquista que
 *   o protocolo de dupla progressão usa como gatilho: subiu ao teto, aumenta o
 *   peso, as repetições caem para a base e o ciclo reinicia.
 * - Num **valor único** `8`, o número é a **expectativa**. Fazer 8 é cumprir, e
 *   cumprir não é superar — indicar aumento aí contrariaria FR-081.
 *
 * Esta função substitui FR-142, que exigia passar do máximo em ambos os casos.
 * A regra antiga esvaziava a faixa na prática: quem segue uma prescrição de 6-8
 * não faz 9, então o gatilho nunca disparava.
 *
 * A não-uniformidade preserva integralmente a avaliação de todo treino de valor
 * único já registrado (FR-165) — que é o que o Princípio I exige.
 */
export function superouIntervalo(realizado: number, intervalo: IntervaloDeRepeticoes): boolean {
  return ehPontaUnica(intervalo) ? realizado > intervalo.maximo : realizado >= intervalo.maximo
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
