import type { Entidade, Id, InstanteUtc } from './base'

/** FR-071, FR-072. Catálogo e personalizado são tratados como equivalentes (FR-077). */
export type OrigemExercicio = 'catalogo' | 'personalizado'

export type Exercicio = Entidade & {
  /** Mutável — renomear nunca quebra histórico (FR-041, FR-074). */
  readonly nome: string
  readonly origem: OrigemExercicio
  readonly grupoMuscular: string | null
  readonly equipamento: string | null
  /** Ocultação de novas seleções (FR-076), distinta de exclusão. */
  readonly ocultoEm: InstanteUtc | null
}

export type IdExercicio = Id
