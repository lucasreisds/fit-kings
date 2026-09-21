import { describe, expect, it } from 'vitest'
import {
  agregarEvolucao,
  temHistoricoSuficiente,
  type ExecucaoParaAgregar,
} from '../../../src/domain/evolucao/agregar'

/**
 * T107 — FR-049, Princípio V.
 *
 * A agregação é calculada sob demanda e **nunca lida de campo persistido**. O
 * teste verifica isso pela assinatura: a função recebe as execuções e devolve
 * os pontos, sem tocar em banco nem em relógio. Não há por onde um valor
 * guardado entrar.
 */

function execucao(
  quando: string,
  cargas: readonly (number | null)[],
  opcoes: { repeticoes?: number; naoRealizadas?: readonly number[] } = {},
): ExecucaoParaAgregar {
  return {
    sessaoId: `sessao-${quando}`,
    concluidaEm: quando,
    series: cargas.map((cargaKg, i) => ({
      cargaKg,
      repeticoes: opcoes.repeticoes ?? 8,
      naoRealizada: opcoes.naoRealizadas?.includes(i + 1) ?? false,
    })),
  }
}

describe('agregação da evolução (FR-049)', () => {
  it('produz um ponto por execução, em ordem cronológica crescente', () => {
    const pontos = agregarEvolucao([
      execucao('2026-03-10T10:00:00.000Z', [45]),
      execucao('2026-03-01T10:00:00.000Z', [40]),
      execucao('2026-03-05T10:00:00.000Z', [42.5]),
    ])

    expect(pontos).toHaveLength(3)
    expect(pontos.map((p) => p.cargaMaximaKg)).toEqual([40, 42.5, 45])
  })

  it('a carga do ponto é a maior entre as séries válidas', () => {
    const pontos = agregarEvolucao([execucao('2026-03-01T10:00:00.000Z', [40, 42.5, 45])])
    expect(pontos[0]!.cargaMaximaKg).toBe(45)
    expect(pontos[0]!.cargaMediaKg).toBeCloseTo(42.5, 2)
  })

  it('calcula o volume da execução', () => {
    const pontos = agregarEvolucao([
      execucao('2026-03-01T10:00:00.000Z', [40, 40], { repeticoes: 10 }),
    ])
    expect(pontos[0]!.volumeKg).toBe(800)
  })

  it('ignora série marcada como não realizada', () => {
    const pontos = agregarEvolucao([
      execucao('2026-03-01T10:00:00.000Z', [40, 99], { naoRealizadas: [2] }),
    ])
    expect(pontos[0]!.cargaMaximaKg).toBe(40)
    expect(pontos[0]!.seriesValidas).toBe(1)
  })

  it('ignora série sem carga informada', () => {
    const pontos = agregarEvolucao([execucao('2026-03-01T10:00:00.000Z', [40, null])])
    expect(pontos[0]!.seriesValidas).toBe(1)
    expect(pontos[0]!.cargaMaximaKg).toBe(40)
  })

  it('execução sem nenhuma série válida não vira ponto (FR-093)', () => {
    const pontos = agregarEvolucao([
      execucao('2026-03-01T10:00:00.000Z', [40]),
      execucao('2026-03-05T10:00:00.000Z', [99], { naoRealizadas: [1] }),
    ])
    expect(pontos).toHaveLength(1)
    expect(pontos[0]!.cargaMaximaKg).toBe(40)
  })

  it('carga zero é valor válido — peso corporal', () => {
    const pontos = agregarEvolucao([execucao('2026-03-01T10:00:00.000Z', [0, 0])])
    expect(pontos).toHaveLength(1)
    expect(pontos[0]!.cargaMaximaKg).toBe(0)
  })

  it('lista vazia produz nenhum ponto', () => {
    expect(agregarEvolucao([])).toEqual([])
  })
})

describe('determinismo (Princípio V)', () => {
  const execucoes = [
    execucao('2026-03-01T10:00:00.000Z', [40]),
    execucao('2026-03-05T10:00:00.000Z', [42.5]),
  ]

  it('mesma entrada, mesmo resultado', () => {
    expect(agregarEvolucao(execucoes)).toEqual(agregarEvolucao(execucoes))
  })

  it('a ordem de entrada não altera o resultado', () => {
    expect(agregarEvolucao([...execucoes].reverse())).toEqual(agregarEvolucao(execucoes))
  })

  it('não altera as execuções recebidas', () => {
    const copia = structuredClone(execucoes)
    agregarEvolucao(execucoes)
    expect(execucoes).toEqual(copia)
  })

  it('é função pura sobre os dados — nenhum valor vem de fora da entrada', () => {
    // Os pontos são inteiramente deriváveis do que entrou: sessaoId e data
    // vêm das execuções, e as cargas das séries.
    const pontos = agregarEvolucao(execucoes)
    expect(pontos.map((p) => p.sessaoId)).toEqual(execucoes.map((e) => e.sessaoId))
    expect(pontos.map((p) => p.quando)).toEqual(execucoes.map((e) => e.concluidaEm))
  })
})

describe('histórico suficiente para a curva (US6, cenário 3)', () => {
  it('um ponto não faz curva', () => {
    expect(temHistoricoSuficiente(agregarEvolucao([execucao('2026-03-01T10:00:00.000Z', [40])]))).toBe(
      false,
    )
  })

  it('dois pontos já fazem', () => {
    const pontos = agregarEvolucao([
      execucao('2026-03-01T10:00:00.000Z', [40]),
      execucao('2026-03-05T10:00:00.000Z', [42.5]),
    ])
    expect(temHistoricoSuficiente(pontos)).toBe(true)
  })

  it('nenhum ponto não faz', () => {
    expect(temHistoricoSuficiente([])).toBe(false)
  })
})
