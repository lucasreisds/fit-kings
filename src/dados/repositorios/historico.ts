/**
 * Consultas de histórico — FR-035 a FR-041, SC-010.
 *
 * Duas consultas carregam requisito de desempenho, e as duas se apoiam em
 * índice composto em vez de varredura:
 *
 * - listar sessões concluídas em ordem cronológica usa `[estado+concluidaEm]`
 *   (200 sessões em menos de 2 s);
 * - listar as execuções de um exercício usa `exercicioId` em `exerciciosSessao`
 *   (menos de 1 s).
 *
 * Toda leitura é restrita às **versões vigentes**, e a autoridade sobre qual é a
 * vigente é `sessoes.versaoVigenteId` — nunca o índice `sessaoVersoes.vigente`,
 * que é cache reconstruível (Princípio V).
 */
import type { BancoFitKings } from '../db'
import { db as bancoPadrao } from '../db'
import type {
  Exercicio,
  ExercicioSessao,
  Id,
  InstanteUtc,
  SerieRealizada,
  Sessao,
} from '../../domain/tipos'
import { seriesValidas, temAlgumaSerieValida } from '../../domain/serie/validade'

export type ResumoDeSessao = {
  readonly sessao: Sessao
  readonly exercicios: number
  readonly seriesValidas: number
  readonly cargaTotalKg: number
}

/** Uma execução de um exercício numa sessão concluída (FR-039). */
export type ExecucaoDeExercicio = {
  readonly sessaoId: Id
  readonly nomeTreino: string
  readonly concluidaEm: InstanteUtc
  readonly corrigida: boolean
  readonly exercicioSessao: ExercicioSessao
  readonly series: readonly SerieRealizada[]
}

export type RepositorioHistorico = {
  listarSessoes(limite?: number): Promise<ResumoDeSessao[]>
  contarSessoes(): Promise<number>
  execucoesDoExercicio(exercicioId: Id, limite?: number): Promise<ExecucaoDeExercicio[]>
  exerciciosComHistorico(): Promise<Exercicio[]>
}

export function criarRepositorioHistorico(
  db: BancoFitKings = bancoPadrao,
): RepositorioHistorico {
  /** Mapa versaoVigenteId → sessão, para todas as concluídas. */
  async function sessoesConcluidas(): Promise<Sessao[]> {
    // O índice composto entrega já ordenado por `concluidaEm`.
    const sessoes = await db.sessoes
      .where('[estado+concluidaEm]')
      .between(['concluida', ''], ['concluida', '￿'])
      .toArray()

    return sessoes
      .filter((sessao) => sessao.excluidoEm === null)
      .sort((a, b) => Date.parse(b.concluidaEm ?? '') - Date.parse(a.concluidaEm ?? ''))
  }

  return {
    async listarSessoes(limite) {
      const sessoes = await sessoesConcluidas()
      const recortadas = limite === undefined ? sessoes : sessoes.slice(0, limite)

      return Promise.all(
        recortadas.map(async (sessao) => {
          const exercicios = (
            await db.exerciciosSessao.where('sessaoVersaoId').equals(sessao.versaoVigenteId).toArray()
          ).filter((exercicio) => exercicio.excluidoEm === null)

          let validas = 0
          let cargaTotalKg = 0

          for (const exercicio of exercicios) {
            const series = (
              await db.seriesRealizadas.where('exercicioSessaoId').equals(exercicio.id).toArray()
            ).filter((serie) => serie.excluidoEm === null)

            for (const serie of seriesValidas(series)) {
              validas += 1
              cargaTotalKg += (serie.cargaKg ?? 0) * (serie.repeticoes ?? 0)
            }
          }

          return {
            sessao,
            exercicios: exercicios.length,
            seriesValidas: validas,
            cargaTotalKg,
          }
        }),
      )
    },

    async contarSessoes() {
      return (await sessoesConcluidas()).length
    },

    /**
     * FR-039 — todas as execuções de um exercício ao longo do tempo.
     *
     * O vínculo é sempre o `exercicioId`, nunca o nome: é por isso que renomear
     * um exercício não quebra nada (FR-041, FR-074).
     */
    async execucoesDoExercicio(exercicioId, limite) {
      const registros = await db.exerciciosSessao.where('exercicioId').equals(exercicioId).toArray()
      const execucoes: ExecucaoDeExercicio[] = []

      for (const registro of registros) {
        if (registro.excluidoEm !== null) continue

        const versao = await db.sessaoVersoes.get(registro.sessaoVersaoId)
        if (!versao) continue

        const sessao = await db.sessoes.get(versao.sessaoId)
        if (!sessao || sessao.estado !== 'concluida' || sessao.concluidaEm === null) continue
        if (sessao.excluidoEm !== null) continue
        // Só a versão vigente. A autoridade é o cabeçalho.
        if (sessao.versaoVigenteId !== versao.id) continue

        const series = (
          await db.seriesRealizadas.where('exercicioSessaoId').equals(registro.id).toArray()
        )
          .filter((serie) => serie.excluidoEm === null)
          .sort((a, b) => a.ordem - b.ordem)

        execucoes.push({
          sessaoId: sessao.id,
          nomeTreino: sessao.nomeTreino,
          concluidaEm: sessao.concluidaEm,
          corrigida: sessao.corrigida,
          exercicioSessao: registro,
          series,
        })
      }

      execucoes.sort((a, b) => Date.parse(b.concluidaEm) - Date.parse(a.concluidaEm))
      return limite === undefined ? execucoes : execucoes.slice(0, limite)
    },

    /** Exercícios que aparecem em alguma execução válida, para as telas de consulta. */
    async exerciciosComHistorico() {
      const sessoes = await sessoesConcluidas()
      const vigentes = new Set(sessoes.map((sessao) => sessao.versaoVigenteId))
      const registros = await db.exerciciosSessao.toArray()

      const ids = new Set<Id>()
      for (const registro of registros) {
        if (registro.excluidoEm !== null) continue
        if (!vigentes.has(registro.sessaoVersaoId)) continue

        const series = (
          await db.seriesRealizadas.where('exercicioSessaoId').equals(registro.id).toArray()
        ).filter((serie) => serie.excluidoEm === null)

        if (temAlgumaSerieValida(series)) ids.add(registro.exercicioId)
      }

      const exercicios = await db.exercicios.bulkGet([...ids])
      return exercicios
        .filter((exercicio): exercicio is Exercicio => exercicio !== undefined)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    },
  }
}

export const repositorioHistorico = criarRepositorioHistorico()
