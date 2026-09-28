/**
 * Contagem de descanso — FR-174, FR-177.
 *
 * **O tempo restante não é guardado; é calculado.** O que se registra é o
 * instante em que o usuário pediu o descanso, que é fato. Quanto falta é
 * derivação, e o Princípio V proíbe persistir derivação como fonte de verdade.
 *
 * A escolha não é só doutrinária. Um contador que decrementa a cada tique para
 * junto com a aba quando o iOS a congela em segundo plano, e volta mostrando o
 * valor de quando parou — mentindo sobre o tempo que passou. Derivar do relógio
 * dá a resposta certa em todos os casos, inclusive quando a resposta é "já
 * acabou há dois minutos".
 *
 * Como toda regra daqui, `agora` chega por parâmetro: o domínio não lê relógio,
 * e a regra de lint impede que leia.
 */
import type { Id, InstanteUtc } from '../tipos'

/** Sem descanso planejado, dois minutos — FR-174. */
export const DESCANSO_PADRAO_SEGUNDOS = 120

export type DescansoEmAndamento = {
  /** A sessão que o originou. Descanso de outra sessão não vale (FR-183). */
  readonly sessaoId: Id
  readonly iniciadoEm: InstanteUtc
  readonly duracaoSegundos: number
}

/**
 * Quanto dura o descanso deste exercício.
 *
 * Zero é tratado como ausência: um descanso planejado de zero segundos é a
 * forma que o editor tem de dizer "não pensei nisso", e não uma instrução para
 * o cronômetro terminar no instante em que começa.
 */
export function duracaoDoDescanso(planejadoSegundos: number | null): number {
  if (planejadoSegundos === null || planejadoSegundos <= 0) return DESCANSO_PADRAO_SEGUNDOS
  return planejadoSegundos
}

/** Quanto falta, nunca negativo. Zero significa terminado. */
export function segundosRestantes(descanso: DescansoEmAndamento, agora: InstanteUtc): number {
  const decorridos = (Date.parse(agora) - Date.parse(descanso.iniciadoEm)) / 1000
  // Um relógio que anda para trás — fuso alterado, correção de hora — não pode
  // esticar o descanso além do que ele foi pedido.
  const restante = descanso.duracaoSegundos - Math.max(0, decorridos)
  return Math.max(0, Math.ceil(restante))
}

export function terminou(descanso: DescansoEmAndamento, agora: InstanteUtc): boolean {
  return segundosRestantes(descanso, agora) === 0
}

/** `m:ss`, que é como se lê um descanso. */
export function formatarRestante(segundos: number): string {
  const minutos = Math.floor(segundos / 60)
  const resto = String(segundos % 60).padStart(2, '0')
  return `${minutos}:${resto}`
}
