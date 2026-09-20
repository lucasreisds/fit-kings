import type { Entidade, Id, InstanteUtc } from './base'
import type { Abordagem } from './treino'

export type EstadoSessao = 'em_andamento' | 'concluida' | 'descartada'

/**
 * Cabeçalho da sessão. **Todos os campos abaixo são imutáveis após a
 * conclusão** — nenhuma correção os alcança (FR-115).
 */
export type Sessao = Entidade & {
  /** `null` se o treino foi excluído — o histórico sobrevive (FR-040). */
  readonly treinoId: Id | null
  /** Cópia do nome no início. Sobrevive à edição e à exclusão do treino. */
  readonly nomeTreino: string
  readonly iniciadaEm: InstanteUtc
  readonly concluidaEm: InstanteUtc | null
  readonly estado: EstadoSessao
  /** **Autoridade** sobre qual versão vale. */
  readonly versaoVigenteId: Id
  /** `true` após a primeira correção (FR-116). */
  readonly corrigida: boolean
}

export type MotivoVersao = 'inicial' | 'correcao'

/**
 * Versionamento por instantâneo. Correção cria uma nova versão; a anterior
 * permanece intacta (D8, FR-114).
 */
export type SessaoVersao = Entidade & {
  readonly sessaoId: Id
  /** Sequencial dentro da sessão, começando em 1. */
  readonly numero: number
  readonly motivo: MotivoVersao
  /**
   * **Índice reconstruível, não autoridade.** A autoridade é
   * `sessoes.versaoVigenteId`. Nenhuma regra de domínio pode tratá-lo como
   * fonte de verdade — ver a rotina de reconstrução em T088.
   */
  readonly vigente: 0 | 1
}

/** FR-088. `fora_do_plano` não tem metas. */
export type OrigemExercicioSessao = 'planejado' | 'fora_do_plano'

/** O exercício tal como executado, dentro de uma versão de sessão. */
export type ExercicioSessao = Entidade & {
  readonly sessaoVersaoId: Id
  readonly exercicioId: Id
  readonly ordem: number
  /** Registrada no histórico (FR-015). */
  readonly abordagem: Abordagem
  readonly origem: OrigemExercicioSessao
  /** `null` quando `origem === 'fora_do_plano'`. */
  readonly itemTreinoId: Id | null
  /**
   * Marcação explícita do usuário (FR-024, FR-091, FR-125). **Autoridade**, não
   * cache: um exercício pulado de propósito e um que a sessão ainda não alcançou
   * têm exatamente as mesmas séries — nenhuma. Só este campo os distingue.
   */
  readonly naoRealizado: boolean
}

/** Degrau de dropset (FR-013). */
export type Degrau = {
  readonly ordem: number
  readonly cargaKg: number
  readonly repeticoes: number
}

export type SerieRealizada = Entidade & {
  readonly exercicioSessaoId: Id
  readonly ordem: number
  /** `null` = não informada. Corrigível (FR-112). */
  readonly cargaKg: number | null
  readonly repeticoes: number | null
  /** Opcional (FR-029). Corrigível. */
  readonly rir: number | null
  /** Distinto de ausência de registro (FR-024). */
  readonly naoRealizada: boolean
  /** `null` em série extra ou fora do plano. */
  readonly seriePlanejadaId: Id | null
  /** `null` em série tradicional. */
  readonly degraus: readonly Degrau[] | null
}
