/**
 * Evolução das cargas de um exercício — FR-049, Princípio V.
 *
 * Agregação **sob demanda**, nunca lida de campo persistido. Cada ponto é uma
 * execução concluída do exercício, e o valor é a maior carga entre as séries
 * válidas daquela execução — a carga de trabalho do dia, que é o que o usuário
 * reconhece ao olhar a curva.
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
  readonly seriesValidas: number
  readonly volumeKg: number
}

export function agregarEvolucao(
  execucoes: readonly ExecucaoParaAgregar[],
): PontoDeEvolucao[] {
  const pontos: PontoDeEvolucao[] = []

  for (const execucao of execucoes) {
    const validas = seriesValidas(execucao.series).filter((serie) => serie.cargaKg !== null)
    // Execução sem série válida não vira ponto: ela não é execução (FR-093).
    if (validas.length === 0) continue

    const cargas = validas.map((serie) => serie.cargaKg!)
    const volume = validas.reduce(
      (total, serie) => total + (serie.cargaKg ?? 0) * (serie.repeticoes ?? 0),
      0,
    )

    pontos.push({
      sessaoId: execucao.sessaoId,
      quando: execucao.concluidaEm,
      cargaMaximaKg: Math.max(...cargas),
      cargaMediaKg: Math.round((cargas.reduce((a, b) => a + b, 0) / cargas.length) * 100) / 100,
      seriesValidas: validas.length,
      volumeKg: Math.round(volume * 100) / 100,
    })
  }

  // Cronológico crescente: a curva se lê da esquerda para a direita.
  return pontos.sort((a, b) => Date.parse(a.quando) - Date.parse(b.quando))
}

/** Há histórico suficiente para mostrar uma curva? (US6, cenário 3) */
export const PONTOS_MINIMOS_PARA_CURVA = 2

export function temHistoricoSuficiente(pontos: readonly PontoDeEvolucao[]): boolean {
  return pontos.length >= PONTOS_MINIMOS_PARA_CURVA
}
