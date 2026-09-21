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
}

/** Alvo por série. Valores podem diferir entre séries do mesmo exercício (FR-009). */
export type SeriePlanejada = Entidade & {
  readonly itemTreinoId: Id
  /** Número da série. */
  readonly ordem: number
  /** Inteiro positivo. */
  readonly repeticoes: number
  /** Aceita fracionados. Zero é válido — peso corporal. */
  readonly cargaKg: number
  /** Inteiro não negativo. `null` = não planejado. */
  readonly rir: number | null
}
