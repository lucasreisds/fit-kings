/**
 * Evolução das cargas de um exercício — FR-049, Princípio V.
 *
 * Agregação **sob demanda**, nunca lida de campo persistido.
 *
 * O filtro desta função já descartou série sem carga, e isso era um defeito:
 * FR-092 define série válida como a que tem repetições registradas e não está
 * marcada como não realizada — carga não entra na definição. A agregação
 * aplicava, portanto, critério mais estrito que a regra de domínio, e uma
 * execução legítima de barra fixa virava zero pontos (FR-145).
 *
 * Daí o **modo** (FR-146): num exercício que nunca teve carga, uma curva de
 * cargas não diz nada — a progressão dele acontece em repetições. O modo é
 * derivado a cada consulta e muda sozinho no dia em que o usuário puser um
 * cinto de lastro na barra fixa.
 */
import type { InstanteUtc } from '../tipos/base'
import { seriesValidas, type SerieAvaliavel } from '../serie/validade'

export type ExecucaoParaAgregar = {
  readonly sessaoId: string
  readonly concluidaEm: InstanteUtc
  readonly series: readonly (SerieAvaliavel & { readonly cargaKg: number | null })[]
}

export type PontoDeEvolucao = {
  readonly sessaoId: string
  readonly quando: InstanteUtc
  readonly cargaMaximaKg: number
  readonly cargaMediaKg: number
  /** Maior número de repetições da execução — o valor do ponto no modo `repeticoes`. */
  readonly repeticoesMaximas: number
  readonly seriesValidas: number
  readonly volumeKg: number
}

/** O que a curva mede (FR-146). */
export type ModoDaEvolucao = 'carga' | 'repeticoes'

export type Evolucao = {
  readonly pontos: readonly PontoDeEvolucao[]
  readonly modo: ModoDaEvolucao
}

/**
 * Carga não informada e carga zero são **equivalentes** (FR-147): as duas
 * significam "sem carga externa". É a leitura coerente com o modelo, que já
 * dizia "zero é válido — peso corporal".
 */
function temCargaExterna(cargaKg: number | null): boolean {
  return cargaKg !== null && cargaKg > 0
}

export function agregarEvolucao(execucoes: readonly ExecucaoParaAgregar[]): Evolucao {
  const pontos: PontoDeEvolucao[] = []
  let algumaComCarga = false

  for (const execucao of execucoes) {
    // FR-145: o filtro é o de série válida, e nada além dele. Série com
    // repetições registradas e sem carga **é** uma execução.
    const validas = seriesValidas(execucao.series)
    // Execução sem série válida não vira ponto: ela não é execução (FR-093).
    if (validas.length === 0) continue

    const cargas = validas.map((serie) => serie.cargaKg ?? 0)
    const repeticoes = validas.map((serie) => serie.repeticoes ?? 0)
    if (validas.some((serie) => temCargaExterna(serie.cargaKg))) algumaComCarga = true

    const volume = validas.reduce(
      (total, serie) => total + (serie.cargaKg ?? 0) * (serie.repeticoes ?? 0),
      0,
    )

    pontos.push({
      sessaoId: execucao.sessaoId,
      quando: execucao.concluidaEm,
      cargaMaximaKg: Math.max(...cargas),
      cargaMediaKg: Math.round((cargas.reduce((a, b) => a + b, 0) / cargas.length) * 100) / 100,
      repeticoesMaximas: Math.max(...repeticoes),
      seriesValidas: validas.length,
      volumeKg: Math.round(volume * 100) / 100,
    })
  }

  return {
    // Cronológico crescente: a curva se lê da esquerda para a direita.
    pontos: pontos.sort((a, b) => Date.parse(a.quando) - Date.parse(b.quando)),
    modo: algumaComCarga ? 'carga' : 'repeticoes',
  }
}

/** O valor do ponto conforme o modo. */
export function valorDoPonto(ponto: PontoDeEvolucao, modo: ModoDaEvolucao): number {
  return modo === 'carga' ? ponto.cargaMaximaKg : ponto.repeticoesMaximas
}

/** Unidade do modo, para rótulos. */
export function unidadeDoModo(modo: ModoDaEvolucao): string {
  return modo === 'carga' ? 'kg' : 'reps'
}

/** Há histórico suficiente para mostrar uma curva? (US6, cenário 3) */
export const PONTOS_MINIMOS_PARA_CURVA = 2

export function temHistoricoSuficiente(pontos: readonly PontoDeEvolucao[]): boolean {
  return pontos.length >= PONTOS_MINIMOS_PARA_CURVA
}
