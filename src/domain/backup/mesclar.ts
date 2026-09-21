/**
 * Mesclagem do arquivo importado — FR-101 a FR-105, contrato §§ 2 a 6.
 *
 * Função pura: recebe o arquivo e o estado local, devolve um **plano** de
 * escrita. Não grava nada. Quem grava é `src/dados/repositorios/backup.ts`, em
 * transação única, e essa separação é o que torna a regra testável sem banco
 * (Princípio V).
 *
 * Duas regras de precedência, e elas são diferentes de propósito:
 *
 * - **Registros editáveis** (exercícios, treinos, itens, séries planejadas):
 *   vence o `alteradoEm` mais recente; empate mantém o local (FR-103).
 * - **Sessões concluídas**: nunca há mesclagem campo a campo e nenhuma versão é
 *   destruída. Arquivo mais recente entra como **nova versão local**; igual ou
 *   anterior é operação nula (FR-102). É daí que sai a idempotência de FR-104:
 *   na segunda importação do mesmo arquivo nada é mais recente, logo nada muda.
 */
import type { Entidade, Id } from '../tipos/base'
import type { Exercicio } from '../tipos/exercicio'
import type { ItemTreino, SeriePlanejada, Treino } from '../tipos/treino'
import type {
  ArquivoDeBackup,
  ExercicioSessaoExportado,
  SerieRealizadaExportada,
  SessaoExportada,
} from './tipos'

export type EstadoLocal = {
  readonly exercicios: readonly Exercicio[]
  readonly treinos: readonly Treino[]
  readonly itensTreino: readonly ItemTreino[]
  readonly seriesPlanejadas: readonly SeriePlanejada[]
  /** Apenas o cabeçalho: a comparação de FR-102 é por `alteradoEm`. */
  readonly sessoes: readonly { readonly id: Id; readonly alteradoEm: string }[]
}

export type AcaoSobreEditavel<T extends Entidade> =
  | { readonly tipo: 'inserir'; readonly registro: T }
  | { readonly tipo: 'atualizar'; readonly registro: T }
  | { readonly tipo: 'ignorar'; readonly id: Id; readonly motivo: MotivoDeIgnorar }

export type MotivoDeIgnorar = 'local_mais_recente' | 'empate_mantem_local' | 'ja_atualizado'

/** Uma sessão do arquivo que entra como nova versão local, com seu conteúdo. */
export type SessaoParaAplicar = {
  readonly sessao: SessaoExportada
  readonly exercicios: readonly ExercicioSessaoExportado[]
  readonly series: readonly SerieRealizadaExportada[]
  /** `inserir` quando a sessão não existe; `nova_versao` quando já existe. */
  readonly tipo: 'inserir' | 'nova_versao'
}

export type PlanoDeImportacao = {
  readonly exercicios: readonly AcaoSobreEditavel<Exercicio>[]
  readonly treinos: readonly AcaoSobreEditavel<Treino>[]
  readonly itensTreino: readonly AcaoSobreEditavel<ItemTreino>[]
  readonly seriesPlanejadas: readonly AcaoSobreEditavel<SeriePlanejada>[]
  readonly sessoes: readonly SessaoParaAplicar[]
  readonly sessoesIgnoradas: readonly { readonly id: Id; readonly motivo: MotivoDeIgnorar }[]
  readonly resumo: ResumoDaImportacao
}

/** O relatório de FR-108: o que entrou, o que foi atualizado, o que foi ignorado. */
export type ResumoDaImportacao = {
  readonly inseridos: number
  readonly atualizados: number
  readonly ignorados: number
  readonly sessoesInseridas: number
  readonly sessoesComNovaVersao: number
  readonly sessoesIgnoradas: number
}

export function planejarImportacao(
  arquivo: ArquivoDeBackup,
  local: EstadoLocal,
): PlanoDeImportacao {
  const exercicios = planejarEditaveis(arquivo.exercicios, local.exercicios)
  const treinos = planejarEditaveis(arquivo.treinos, local.treinos)
  const itensTreino = planejarEditaveis(arquivo.itensTreino, local.itensTreino)
  const seriesPlanejadas = planejarEditaveis(arquivo.seriesPlanejadas, local.seriesPlanejadas)

  const { aplicar, ignoradas } = planejarSessoes(arquivo, local)

  const editaveis = [exercicios, treinos, itensTreino, seriesPlanejadas]
  const contar = (tipo: AcaoSobreEditavel<never>['tipo']) =>
    editaveis.reduce((total, lista) => total + lista.filter((a) => a.tipo === tipo).length, 0)

  return {
    exercicios,
    treinos,
    itensTreino,
    seriesPlanejadas,
    sessoes: aplicar,
    sessoesIgnoradas: ignoradas,
    resumo: {
      inseridos: contar('inserir'),
      atualizados: contar('atualizar'),
      ignorados: contar('ignorar'),
      sessoesInseridas: aplicar.filter((s) => s.tipo === 'inserir').length,
      sessoesComNovaVersao: aplicar.filter((s) => s.tipo === 'nova_versao').length,
      sessoesIgnoradas: ignoradas.length,
    },
  }
}

/**
 * FR-101 e FR-103. Localiza por `id` — nunca por nome. É o que mantém a
 * identidade do exercício estável entre aparelhos (FR-105): um exercício
 * renomeado num aparelho e não no outro continua sendo o mesmo registro, e o
 * histórico dos dois converge em vez de se partir em dois.
 */
function planejarEditaveis<T extends Entidade>(
  doArquivo: readonly T[],
  locais: readonly T[],
): AcaoSobreEditavel<T>[] {
  const porId = new Map(locais.map((registro) => [registro.id, registro]))

  return doArquivo.map((registro) => {
    const local = porId.get(registro.id)
    if (!local) return { tipo: 'inserir', registro }

    const doArquivoEm = Date.parse(registro.alteradoEm)
    const localEm = Date.parse(local.alteradoEm)

    if (doArquivoEm > localEm) return { tipo: 'atualizar', registro }
    // Empate mantém o local. É o que torna a segunda importação do mesmo
    // arquivo uma operação nula (FR-104).
    if (doArquivoEm === localEm) {
      return { tipo: 'ignorar', id: registro.id, motivo: 'empate_mantem_local' }
    }
    return { tipo: 'ignorar', id: registro.id, motivo: 'local_mais_recente' }
  })
}

function planejarSessoes(
  arquivo: ArquivoDeBackup,
  local: EstadoLocal,
): {
  aplicar: SessaoParaAplicar[]
  ignoradas: { id: Id; motivo: MotivoDeIgnorar }[]
} {
  const locaisPorId = new Map(local.sessoes.map((sessao) => [sessao.id, sessao]))

  const exerciciosPorSessao = agrupar(arquivo.exerciciosSessao, (e) => e.sessaoId)
  const seriesPorExercicio = agrupar(arquivo.seriesRealizadas, (s) => s.exercicioSessaoId)

  const aplicar: SessaoParaAplicar[] = []
  const ignoradas: { id: Id; motivo: MotivoDeIgnorar }[] = []

  for (const sessao of arquivo.sessoes) {
    const exerciciosDaSessao = exerciciosPorSessao.get(sessao.id) ?? []
    const seriesDaSessao = exerciciosDaSessao.flatMap(
      (exercicio) => seriesPorExercicio.get(exercicio.id) ?? [],
    )

    const localDaSessao = locaisPorId.get(sessao.id)

    if (!localDaSessao) {
      aplicar.push({
        sessao,
        exercicios: exerciciosDaSessao,
        series: seriesDaSessao,
        tipo: 'inserir',
      })
      continue
    }

    const doArquivoEm = Date.parse(sessao.alteradoEm)
    const localEm = Date.parse(localDaSessao.alteradoEm)

    if (doArquivoEm > localEm) {
      // Nova versão local. A anterior é preservada — o Princípio I proíbe
      // destruir qualquer versão de sessão concluída, inclusive por importação.
      aplicar.push({
        sessao,
        exercicios: exerciciosDaSessao,
        series: seriesDaSessao,
        tipo: 'nova_versao',
      })
    } else {
      ignoradas.push({
        id: sessao.id,
        motivo: doArquivoEm === localEm ? 'empate_mantem_local' : 'local_mais_recente',
      })
    }
  }

  return { aplicar, ignoradas }
}

function agrupar<T, C>(itens: readonly T[], chave: (item: T) => C): Map<C, T[]> {
  const mapa = new Map<C, T[]>()
  for (const item of itens) {
    const c = chave(item)
    const lista = mapa.get(c)
    if (lista) lista.push(item)
    else mapa.set(c, [item])
  }
  return mapa
}

/** O plano não muda nada? Usado pelo relatório e pela prova de idempotência. */
export function planoEhVazio(plano: PlanoDeImportacao): boolean {
  return (
    plano.resumo.inseridos === 0 &&
    plano.resumo.atualizados === 0 &&
    plano.resumo.sessoesInseridas === 0 &&
    plano.resumo.sessoesComNovaVersao === 0
  )
}
