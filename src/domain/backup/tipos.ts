/**
 * Tipos do arquivo de backup — contracts/backup-file.md.
 *
 * Este é o **único contrato externo** do aplicativo. Ele não é consumido por um
 * servidor: é consumido por versões futuras do próprio aplicativo (FR-097).
 * Alterá-lo sem respeitar a política de compatibilidade quebra backups que o
 * usuário já gerou.
 */
import type { DeslocamentoLocal, Entidade, Id, InstanteUtc } from '../tipos/base'
import type { Exercicio } from '../tipos/exercicio'
import type { ItemTreino, SeriePlanejada, Treino } from '../tipos/treino'
import type { Degrau, EstadoSessao, OrigemExercicioSessao } from '../tipos/sessao'
import type { Abordagem } from '../tipos/treino'

/** Versão corrente do formato. Ver a política de compatibilidade no contrato. */
export const FORMAT_VERSION_CORRENTE = 1

/** Versões que esta build sabe ler. Toda versão lê as anteriores (Princípio IV). */
export const FORMAT_VERSIONS_SUPORTADAS: readonly number[] = [1]

/**
 * Sessão **achatada na versão vigente**. A estrutura `sessaoVersoes` do modelo
 * interno não é exportada: o arquivo carrega só a versão que vale, e o rastro
 * de correções é local, por decisão do proprietário (D8).
 */
export type SessaoExportada = Entidade & {
  readonly treinoId: Id | null
  readonly nomeTreino: string
  readonly iniciadaEm: InstanteUtc
  readonly concluidaEm: InstanteUtc | null
  readonly estado: EstadoSessao
  /** Houve ao menos uma correção (FR-116). */
  readonly corrigida: boolean
  // Sem `versaoVigenteId`: é identificador interno e não atravessa aparelhos.
}

/** Referencia `sessaoId` diretamente, não `sessaoVersaoId` (contrato § achatamento). */
export type ExercicioSessaoExportado = Entidade & {
  readonly sessaoId: Id
  readonly exercicioId: Id
  readonly ordem: number
  readonly abordagem: Abordagem
  readonly origem: OrigemExercicioSessao
  readonly itemTreinoId: Id | null
  readonly naoRealizado: boolean
}

export type SerieRealizadaExportada = Entidade & {
  readonly exercicioSessaoId: Id
  readonly ordem: number
  readonly cargaKg: number | null
  readonly repeticoes: number | null
  readonly rir: number | null
  readonly naoRealizada: boolean
  readonly seriePlanejadaId: Id | null
  readonly degraus: readonly Degrau[] | null
}

export type ArquivoDeBackup = {
  readonly formatVersion: number
  readonly geradoEm: InstanteUtc
  readonly deslocamentoLocal: DeslocamentoLocal
  readonly aplicacao: { readonly nome: string; readonly versao: string }

  readonly exercicios: readonly Exercicio[]
  readonly treinos: readonly Treino[]
  readonly itensTreino: readonly ItemTreino[]
  readonly seriesPlanejadas: readonly SeriePlanejada[]
  readonly sessoes: readonly SessaoExportada[]
  readonly exerciciosSessao: readonly ExercicioSessaoExportado[]
  readonly seriesRealizadas: readonly SerieRealizadaExportada[]
}

/** Coleções obrigatórias, na ordem de dependência referencial. */
export const COLECOES = [
  'exercicios',
  'treinos',
  'itensTreino',
  'seriesPlanejadas',
  'sessoes',
  'exerciciosSessao',
  'seriesRealizadas',
] as const

export type NomeDeColecao = (typeof COLECOES)[number]

/** Nome sugerido do arquivo. `data` vem do chamador — o domínio não lê relógio. */
export function nomeDeArquivo(data: InstanteUtc): string {
  return `fit-kings-backup-${data.slice(0, 10)}.json`
}
