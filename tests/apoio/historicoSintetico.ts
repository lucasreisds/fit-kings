/**
 * Gera histórico em volume, escrevendo direto nas tabelas.
 *
 * Passar pelos repositórios seria mais fiel, mas 200 sessões pelo caminho
 * transacional levariam minutos e o que está sob teste aqui é a **consulta**,
 * não a escrita.
 */
import type { BancoFitKings } from '../../src/dados/db'
import { novoId } from '../../src/plataforma/id'
import type {
  Exercicio,
  ExercicioSessao,
  SerieRealizada,
  Sessao,
  SessaoVersao,
} from '../../src/domain/tipos'

const BASE = Date.parse('2024-01-01T10:00:00.000Z')
const UM_DIA = 86_400_000

export type HistoricoSintetico = {
  readonly exercicios: readonly Exercicio[]
  readonly sessoes: readonly Sessao[]
}

export async function semearHistorico(
  db: BancoFitKings,
  opcoes: { sessoes: number; exerciciosPorSessao: number; seriesPorExercicio: number },
): Promise<HistoricoSintetico> {
  const comuns = (instante: string) => ({
    criadoEm: instante,
    alteradoEm: instante,
    deslocamentoLocal: '-03:00',
    excluidoEm: null,
  })

  const exercicios: Exercicio[] = Array.from({ length: opcoes.exerciciosPorSessao }, (_, i) => ({
    id: novoId(),
    nome: `Exercício ${i + 1}`,
    origem: 'catalogo' as const,
    grupoMuscular: 'Geral',
    equipamento: 'Barra',
    ocultoEm: null,
    ...comuns(new Date(BASE).toISOString()),
  }))
  await db.exercicios.bulkAdd(exercicios)

  const sessoes: Sessao[] = []
  const versoes: SessaoVersao[] = []
  const exerciciosSessao: ExercicioSessao[] = []
  const series: SerieRealizada[] = []

  for (let s = 0; s < opcoes.sessoes; s += 1) {
    const inicio = new Date(BASE + s * UM_DIA).toISOString()
    const fim = new Date(BASE + s * UM_DIA + 3_600_000).toISOString()
    const sessaoId = novoId()
    const versaoId = novoId()

    sessoes.push({
      id: sessaoId,
      treinoId: null,
      nomeTreino: `Treino ${(s % 3) + 1}`,
      iniciadaEm: inicio,
      concluidaEm: fim,
      estado: 'concluida',
      versaoVigenteId: versaoId,
      corrigida: false,
      ...comuns(fim),
    })

    versoes.push({
      id: versaoId,
      sessaoId,
      numero: 1,
      motivo: 'inicial',
      vigente: 1,
      ...comuns(fim),
    })

    for (let e = 0; e < opcoes.exerciciosPorSessao; e += 1) {
      const exercicioSessaoId = novoId()
      exerciciosSessao.push({
        id: exercicioSessaoId,
        sessaoVersaoId: versaoId,
        exercicioId: exercicios[e]!.id,
        ordem: e + 1,
        abordagem: 'tradicional',
        origem: 'planejado',
        itemTreinoId: null,
        naoRealizado: false,
        ...comuns(fim),
      })

      for (let r = 0; r < opcoes.seriesPorExercicio; r += 1) {
        series.push({
          id: novoId(),
          exercicioSessaoId,
          ordem: r + 1,
          // Carga sobe devagar ao longo das sessões: serve à evolução também.
          cargaKg: 40 + Math.floor(s / 4) * 2.5,
          repeticoes: 8,
          rir: 1,
          naoRealizada: false,
          seriePlanejadaId: null,
          degraus: null,
          ...comuns(fim),
        })
      }
    }
  }

  await db.sessoes.bulkAdd(sessoes)
  await db.sessaoVersoes.bulkAdd(versoes)
  await db.exerciciosSessao.bulkAdd(exerciciosSessao)
  await db.seriesRealizadas.bulkAdd(series)

  return { exercicios, sessoes }
}
