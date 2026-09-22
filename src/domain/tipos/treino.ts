import type { Entidade, Id } from './base'

export type Treino = Entidade & {
  /** Obrigatório, não vazio (FR-001). */
  readonly nome: string
}

/**
 * Valor aberto por FR-014: uma abordagem nova é valor novo neste campo, sem
 * alteração estrutural e sem incrementar `formatVersion` (SC-014).
 */
export type Abordagem = 'tradicional' | 'dropset' | (string & {})

export const ABORDAGENS_CONHECIDAS = ['tradicional', 'dropset'] as const

/** A presença de um exercício dentro de um treino. */
export type ItemTreino = Entidade & {
  readonly treinoId: Id
  /** Sempre o identificador estável do exercício, nunca o nome (FR-041). */
  readonly exercicioId: Id
  /** Posição no treino (FR-007). */
  readonly ordem: number
  readonly abordagem: Abordagem
  /**
   * Descanso planejado, em segundos (FR-148). `null` = não planejado, que é o
   * estado de todo item criado antes desta feature.
   *
   * **É valor exibido, nunca cronometrado** (FR-151). A constituição veda o
   * cronômetro de descanso; um número escrito ao lado da meta é da mesma
   * natureza de repetições, carga e RIR. Transformá-lo em contagem regressiva
   * exigiria emenda constitucional, não uma decisão de implementação.
   */
  readonly descansoSegundos: number | null
}

/** Alvo por série. Valores podem diferir entre séries do mesmo exercício (FR-009). */
export type SeriePlanejada = Entidade & {
  readonly itemTreinoId: Id
  /** Número da série. */
  readonly ordem: number
  /**
   * **O mínimo do intervalo de repetições** (FR-139, FR-140).
   *
   * O campo não mudou de significado: sempre foi o alvo mínimo aceitável. O que
   * mudou é a leitura ficar explícita, agora que existe um máximo ao lado.
   */
  readonly repeticoes: number
  /**
   * Máximo do intervalo. `null` = intervalo de ponta única, que é o
   * comportamento de sempre e o estado de todo registro anterior a esta
   * feature (FR-144).
   *
   * Toda comparação usa `repeticoesMax ?? repeticoes` como máximo — e é por
   * isso que **não existe um segundo caminho de código** para o valor único.
   */
  readonly repeticoesMax: number | null
  /** Aceita fracionados. Zero é válido — peso corporal. */
  readonly cargaKg: number
  /** Inteiro não negativo. `null` = não planejado. */
  readonly rir: number | null
}
