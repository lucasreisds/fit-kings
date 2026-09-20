/**
 * Montagem do arquivo de exportação — FR-095, FR-098, contrato § O que contém.
 *
 * Função pura sobre os registros já lidos do banco. O que entra e o que fica de
 * fora:
 *
 * **Entra** todo registro com `excluidoEm` preenchido, com sua marca (FR-098).
 * Sem eles, a importação ressuscitaria no outro aparelho exatamente o que o
 * usuário apagou neste.
 *
 * **Não entra** sessão `em_andamento` nem `descartada` (FR-095, contrato), nem
 * `metaAplicacao` — que descreve a instalação, não o histórico. Nem as versões
 * anteriores de sessões corrigidas: o arquivo carrega só a vigente, por decisão
 * do proprietário (D8).
 */
import type { Id, InstanteUtc } from '../tipos/base'
import type { Exercicio } from '../tipos/exercicio'
import type { ItemTreino, SeriePlanejada, Treino } from '../tipos/treino'
import type { ExercicioSessao, SerieRealizada, Sessao } from '../tipos/sessao'
import {
  FORMAT_VERSION_CORRENTE,
  type ArquivoDeBackup,
  type ExercicioSessaoExportado,
  type SerieRealizadaExportada,
  type SessaoExportada,
} from './tipos'

/** Tudo o que a exportação precisa ler do banco, já resolvido na versão vigente. */
export type MaterialDeExportacao = {
  readonly exercicios: readonly Exercicio[]
  readonly treinos: readonly Treino[]
  readonly itensTreino: readonly ItemTreino[]
  readonly seriesPlanejadas: readonly SeriePlanejada[]
  readonly sessoes: readonly Sessao[]
  /** Já filtrados para as versões vigentes das sessões acima. */
  readonly exerciciosSessao: readonly (ExercicioSessao & { readonly sessaoId: Id })[]
  readonly seriesRealizadas: readonly SerieRealizada[]
}

export type CabecalhoDeExportacao = {
  readonly geradoEm: InstanteUtc
  readonly deslocamentoLocal: string
  readonly versaoDaAplicacao: string
}

export function montarArquivo(
  material: MaterialDeExportacao,
  cabecalho: CabecalhoDeExportacao,
): ArquivoDeBackup {
  // Só sessões concluídas atravessam. `em_andamento` ainda não é histórico e
  // `descartada` nunca vai ser.
  const sessoes = material.sessoes
    .filter((sessao) => sessao.estado === 'concluida')
    .map(acharSessao)

  const idsDeSessao = new Set(sessoes.map((sessao) => sessao.id))

  const exerciciosSessao = material.exerciciosSessao
    .filter((exercicio) => idsDeSessao.has(exercicio.sessaoId))
    .map(acharExercicioSessao)

  const idsDeExercicioSessao = new Set(exerciciosSessao.map((exercicio) => exercicio.id))

  const seriesRealizadas = material.seriesRealizadas
    .filter((serie) => idsDeExercicioSessao.has(serie.exercicioSessaoId))
    .map(acharSerie)

  return {
    formatVersion: FORMAT_VERSION_CORRENTE,
    geradoEm: cabecalho.geradoEm,
    deslocamentoLocal: cabecalho.deslocamentoLocal,
    aplicacao: { nome: 'fit-kings', versao: cabecalho.versaoDaAplicacao },

    exercicios: [...material.exercicios],
    treinos: [...material.treinos],
    itensTreino: [...material.itensTreino],
    seriesPlanejadas: [...material.seriesPlanejadas],
    sessoes,
    exerciciosSessao,
    seriesRealizadas,
  }
}

/**
 * Achata a sessão na versão vigente: `versaoVigenteId` é identificador interno e
 * não atravessa aparelhos (contrato § achatamento).
 */
function acharSessao(sessao: Sessao): SessaoExportada {
  const { versaoVigenteId: _versaoVigenteId, ...resto } = sessao
  return resto
}

/** Passa a referenciar `sessaoId`, não `sessaoVersaoId`. */
function acharExercicioSessao(
  exercicio: ExercicioSessao & { sessaoId: Id },
): ExercicioSessaoExportado {
  const { sessaoVersaoId: _sessaoVersaoId, sessaoId, ...resto } = exercicio
  return { ...resto, sessaoId }
}

function acharSerie(serie: SerieRealizada): SerieRealizadaExportada {
  return serie
}

/** Serializa. Indentado: o contrato exige que o arquivo seja inspecionável. */
export function serializar(arquivo: ArquivoDeBackup): string {
  return JSON.stringify(arquivo, null, 2)
}
