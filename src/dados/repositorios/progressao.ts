/**
 * Consulta da indicação de progressão — FR-042 a FR-048, FR-094, FR-117.
 *
 * **Por consulta, nunca por campo persistido** (Princípio V). A indicação ativa
 * é, por definição, a vinculada à execução finalizada mais recente do
 * exercício — então ela é recalculada toda vez que alguém pergunta. É isso que
 * faz FR-117 funcionar sem ação do usuário: corrigido um valor, a consulta
 * seguinte já reflete o corrigido, porque não existe nada gravado para ficar
 * desatualizado.
 */
import type { BancoFitKings } from '../db'
import { db as bancoPadrao } from '../db'
import type { Id, InstanteUtc } from '../../domain/tipos'
import {
  avaliarProgressao,
  type AvaliacaoDeProgressao,
  type SeriePlanejadaParaAvaliar,
} from '../../domain/progressao/avaliar'
import { execucaoAnterior } from '../../funcionalidades/execucao/consultas'

export type IndicacaoDeProgressao = {
  readonly exercicioId: Id
  readonly avaliacao: AvaliacaoDeProgressao
  /** A execução que fundamenta a indicação (FR-047). */
  readonly baseadaEm: { readonly sessaoId: Id; readonly concluidaEm: InstanteUtc } | null
  readonly cargaAnteriorKg: number | null
}

export type RepositorioProgressao = {
  indicacaoPara(
    exercicioId: Id,
    planejadas: readonly SeriePlanejadaParaAvaliar[],
    opcoes?: { ignorarSessaoId?: Id },
  ): Promise<IndicacaoDeProgressao>
}

export function criarRepositorioProgressao(
  db: BancoFitKings = bancoPadrao,
): RepositorioProgressao {
  return {
    async indicacaoPara(exercicioId, planejadas, opcoes = {}) {
      // FR-094: a execução anterior é a sessão concluída mais recente com ao
      // menos uma série válida. Um exercício planejado e totalmente pulado não
      // conta, e por isso a indicação anterior permanece (FR-093, SC-024).
      const anterior = await execucaoAnterior(
        exercicioId,
        opcoes.ignorarSessaoId ? { ignorarSessaoId: opcoes.ignorarSessaoId } : {},
        db,
      )

      if (!anterior) {
        return {
          exercicioId,
          avaliacao: avaliarProgressao({ planejadas, realizadas: [] }),
          baseadaEm: null,
          cargaAnteriorKg: null,
        }
      }

      return {
        exercicioId,
        avaliacao: avaliarProgressao({ planejadas, realizadas: anterior.series }),
        baseadaEm: { sessaoId: anterior.sessaoId, concluidaEm: anterior.concluidaEm },
        cargaAnteriorKg: anterior.cargaKg,
      }
    },
  }
}

export const repositorioProgressao = criarRepositorioProgressao()
