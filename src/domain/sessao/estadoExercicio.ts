/**
 * Estado do exercício na sessão — FR-125, FR-126, Princípio V.
 *
 * **Regra única, em um só lugar.** Nenhuma tela, repositório ou consulta pode
 * recalcular este estado por conta própria. O estado nunca é gravado: ele é
 * derivado das séries registradas e da marcação `naoRealizado`.
 *
 * Por que não existe um campo `estado` na tabela: dois dos três valores derivam
 * das séries, mas `nao_realizado` não deriva de nada. Um exercício que o usuário
 * pulou de propósito e um que a sessão ainda não alcançou têm exatamente as
 * mesmas séries — nenhuma. Só a marcação os distingue. Persistir o trio inteiro
 * criaria um cache que não fecha, porque reconstruí-lo a partir das séries
 * apagaria justamente a informação que só existe no campo.
 *
 * `inconsistente` é **retorno de primeira classe, não exceção**. A combinação de
 * marcação ativa com série válida é inalcançável pelo fluxo normal — os
 * invariantes de FR-126 a impedem — mas alcançável por arquivo de backup
 * adulterado ou por defeito. Devolvê-la explicitamente é o que permite ao
 * aplicativo sinalizá-la, em vez de escolher em silêncio entre a marcação e as
 * séries.
 */
import { seriesValidas, type SerieAvaliavel } from '../serie/validade'

export type EstadoExercicioSessao =
  /** Todas as séries planejadas têm série válida. */
  | 'realizado'
  /** Parte das planejadas tem série válida. */
  | 'parcial'
  /** Marcado pelo usuário como não realizado, sem série válida. */
  | 'nao_realizado'
  /** A sessão ainda não chegou nele: sem marcação e sem série válida. */
  | 'nao_alcancado'
  /** Marcação ativa **e** série válida registrada. Sinalizar, nunca resolver. */
  | 'inconsistente'

export type EntradaDoEstado = {
  readonly series: readonly SerieAvaliavel[]
  /** Intenção explícita do usuário (FR-024, FR-091, FR-125). */
  readonly naoRealizado: boolean
  /**
   * Quantas séries o plano previa. `0` em exercício fora do plano, que não tem
   * meta (FR-088) — nele qualquer série válida já basta para `realizado`.
   */
  readonly seriesPlanejadas: number
}

export function estadoExercicioSessao(entrada: EntradaDoEstado): EstadoExercicioSessao {
  const validas = seriesValidas(entrada.series).length

  // A inconsistência é verificada primeiro: qualquer outra ordem escolheria em
  // silêncio entre a marcação e as séries, que é o que FR-126 proíbe.
  if (entrada.naoRealizado && validas > 0) return 'inconsistente'

  if (entrada.naoRealizado) return 'nao_realizado'
  if (validas === 0) return 'nao_alcancado'

  // Série extra não muda o estado: `validas` pode passar do planejado, e passar
  // do planejado continua sendo `realizado` (FR-079 tem o mesmo espírito).
  if (entrada.seriesPlanejadas === 0) return 'realizado'
  return validas >= entrada.seriesPlanejadas ? 'realizado' : 'parcial'
}

const TEXTOS: Record<EstadoExercicioSessao, string> = {
  realizado: 'Feito',
  parcial: 'Parcial',
  nao_realizado: 'Não realizado',
  nao_alcancado: 'A fazer',
  inconsistente: 'Registro inconsistente',
}

/** Texto do estado. A cor nunca é o único portador do significado. */
export function textoDoEstado(estado: EstadoExercicioSessao): string {
  return TEXTOS[estado]
}

/** O exercício conta como execução finalizada para FR-043? (FR-093) */
export function contaComoExecucao(estado: EstadoExercicioSessao): boolean {
  return estado === 'realizado' || estado === 'parcial'
}
