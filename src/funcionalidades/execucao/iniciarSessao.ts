/**
 * Início de sessão — FR-016, FR-017, FR-028.
 *
 * **A sessão nasce com sua própria cópia dos valores planejados.** Não é
 * otimização nem conveniência: é o que faz o histórico não depender do treino
 * que o originou (Princípio I). Editar ou excluir o treino depois não alcança
 * nenhuma sessão — é o portão de teste 2 da constituição, e a cópia feita aqui
 * é o que o sustenta.
 *
 * A cópia guardada é o plano **da sessão**: `nomeTreino` no cabeçalho, e
 * `seriePlanejadaId` em cada série realizada apontando para a meta daquele dia.
 * As metas em si permanecem em `seriesPlanejadas`, onde a exclusão é lógica —
 * uma série planejada removida do treino continua legível pela sessão que a
 * referencia.
 */
import type { Id } from '../../domain/tipos'
import {
  repositorioSessoes,
  type RepositorioSessoes,
  type SessaoCompleta,
} from '../../dados/repositorios/sessoes'
import { repositorioTreinos, type RepositorioTreinos } from '../../dados/repositorios/treinos'
import { RegistroNaoEncontradoError } from '../../dados/repositorios/base'

/**
 * Os repositórios entram por parâmetro, com o padrão do aplicativo. É o que
 * permite testar esta função contra um banco isolado sem tocar no do usuário.
 */
export type Colaboradores = {
  readonly treinos: RepositorioTreinos
  readonly sessoes: RepositorioSessoes
}

const PADRAO: Colaboradores = { treinos: repositorioTreinos, sessoes: repositorioSessoes }

export type PlanoDaSessao = {
  /** Metas por exercício da sessão, congeladas no início. */
  readonly porExercicioSessao: ReadonlyMap<Id, readonly MetaDaSerie[]>
}

export type MetaDaSerie = {
  readonly seriePlanejadaId: Id
  readonly ordem: number
  /** Mínimo do intervalo (FR-140). */
  readonly repeticoes: number
  /** Máximo. `null` = ponta única. */
  readonly repeticoesMax: number | null
  readonly cargaKg: number
  readonly rir: number | null
}

export async function iniciarSessao(
  treinoId: Id,
  colaboradores: Colaboradores = PADRAO,
): Promise<SessaoCompleta> {
  const treino = await colaboradores.treinos.obter(treinoId)
  if (!treino) throw new RegistroNaoEncontradoError(treinoId)

  return colaboradores.sessoes.criar({
    treinoId: treino.treino.id,
    // Cópia do nome: sobrevive à edição e à exclusão do treino (FR-040).
    nomeTreino: treino.treino.nome,
    exercicios: treino.itens.map((item) => ({
      exercicioId: item.item.exercicioId,
      ordem: item.item.ordem,
      abordagem: item.item.abordagem,
      origem: 'planejado' as const,
      itemTreinoId: item.item.id,
    })),
  })
}

/**
 * Metas da sessão — a cópia que FR-017 exige.
 *
 * O plano é lido **como era em `iniciadaEm`**, não como está agora. A
 * reconstrução temporal é possível porque `seriesPlanejadas` é aditiva e a
 * exclusão é lógica: editar uma série já executada cria uma sucessora e marca a
 * anterior, sem apagá-la. Editar ou excluir o treino depois, portanto, não
 * alcança esta sessão — é o portão de teste 2 da constituição.
 */
export async function lerPlanoDaSessao(
  sessao: SessaoCompleta,
  colaboradores: Colaboradores = PADRAO,
): Promise<PlanoDaSessao> {
  const porExercicioSessao = new Map<Id, readonly MetaDaSerie[]>()

  for (const item of sessao.exercicios) {
    const itemTreinoId = item.exercicio.itemTreinoId

    // Exercício fora do plano não tem meta (FR-088), e é por isso que ele nunca
    // gera indicação de progressão na sessão em que foi acrescentado (FR-089).
    if (itemTreinoId === null) {
      porExercicioSessao.set(item.exercicio.id, [])
      continue
    }

    const series = await colaboradores.treinos.seriesPlanejadasEm(
      itemTreinoId,
      sessao.sessao.iniciadaEm,
    )

    porExercicioSessao.set(
      item.exercicio.id,
      series.map((serie) => ({
        seriePlanejadaId: serie.id,
        ordem: serie.ordem,
        repeticoes: serie.repeticoes,
        repeticoesMax: serie.repeticoesMax,
        cargaKg: serie.cargaKg,
        rir: serie.rir,
      })),
    )
  }

  return { porExercicioSessao }
}
