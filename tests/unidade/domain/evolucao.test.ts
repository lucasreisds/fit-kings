import { describe, expect, it } from 'vitest'
import {
  agregarEvolucao,
  temHistoricoSuficiente,
  unidadeDoModo,
  valorDoPonto,
  type ExecucaoParaAgregar,
} from '../../../src/domain/evolucao/agregar'

/**
 * T107 (feature 001) e T043 a T045 (feature 002) — FR-049, FR-145 a FR-147.
 *
 * O defeito que a feature 002 corrige aqui: a agregação descartava série sem
 * carga, aplicando critério mais estrito que a definição de série válida de
 * FR-092. Uma execução legítima de barra fixa virava zero pontos, e a tela de
 * Progresso mostrava "0 execuções" sobre dado que existia e estava correto.
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
    const { pontos } = agregarEvolucao([
      execucao('2026-03-10T10:00:00.000Z', [45]),
      execucao('2026-03-01T10:00:00.000Z', [40]),
      execucao('2026-03-05T10:00:00.000Z', [42.5]),
    ])

    expect(pontos).toHaveLength(3)
    expect(pontos.map((p) => p.cargaMaximaKg)).toEqual([40, 42.5, 45])
  })

  it('a carga do ponto é a maior entre as séries válidas', () => {
    const { pontos } = agregarEvolucao([execucao('2026-03-01T10:00:00.000Z', [40, 42.5, 45])])
    expect(pontos[0]!.cargaMaximaKg).toBe(45)
    expect(pontos[0]!.cargaMediaKg).toBeCloseTo(42.5, 2)
  })

  it('calcula o volume da execução', () => {
    const { pontos } = agregarEvolucao([
      execucao('2026-03-01T10:00:00.000Z', [40, 40], { repeticoes: 10 }),
    ])
    expect(pontos[0]!.volumeKg).toBe(800)
  })

  it('ignora série marcada como não realizada', () => {
    const { pontos } = agregarEvolucao([
      execucao('2026-03-01T10:00:00.000Z', [40, 99], { naoRealizadas: [2] }),
    ])
    expect(pontos[0]!.cargaMaximaKg).toBe(40)
    expect(pontos[0]!.seriesValidas).toBe(1)
  })

  it('execução sem nenhuma série válida não vira ponto (FR-093)', () => {
    const { pontos } = agregarEvolucao([
      execucao('2026-03-01T10:00:00.000Z', [40]),
      execucao('2026-03-05T10:00:00.000Z', [99], { naoRealizadas: [1] }),
    ])
    expect(pontos).toHaveLength(1)
    expect(pontos[0]!.cargaMaximaKg).toBe(40)
  })

  it('lista vazia produz nenhum ponto', () => {
    expect(agregarEvolucao([]).pontos).toEqual([])
  })
})

/**
 * T043 a T045 — o defeito da barra fixa.
 */
describe('exercício sem carga (FR-145, FR-146, FR-147)', () => {
  it('série válida sem carga **não** é descartada (FR-145)', () => {
    const { pontos } = agregarEvolucao([
      execucao('2026-03-01T10:00:00.000Z', [null, null], { repeticoes: 8 }),
      execucao('2026-03-08T10:00:00.000Z', [null, null], { repeticoes: 10 }),
    ])

    // Era aqui que a barra fixa virava "0 execuções".
    expect(pontos).toHaveLength(2)
    expect(pontos[0]!.seriesValidas).toBe(2)
  })

  it('o modo é `repeticoes` quando nenhuma execução teve carga (FR-146)', () => {
    const { modo } = agregarEvolucao([
      execucao('2026-03-01T10:00:00.000Z', [null], { repeticoes: 8 }),
      execucao('2026-03-08T10:00:00.000Z', [null], { repeticoes: 10 }),
    ])
    expect(modo).toBe('repeticoes')
  })

  it('o modo é `carga` quando alguma execução teve carga', () => {
    const { modo } = agregarEvolucao([
      execucao('2026-03-01T10:00:00.000Z', [null], { repeticoes: 8 }),
      execucao('2026-03-08T10:00:00.000Z', [10], { repeticoes: 8 }),
    ])
    expect(modo).toBe('carga')
  })

  it('carga zero é equivalente a carga ausente (FR-147)', () => {
    const comNulo = agregarEvolucao([execucao('2026-03-01T10:00:00.000Z', [null, null])])
    const comZero = agregarEvolucao([execucao('2026-03-01T10:00:00.000Z', [0, 0])])

    expect(comZero.modo).toBe(comNulo.modo)
    expect(comZero.modo).toBe('repeticoes')
    expect(comZero.pontos).toHaveLength(comNulo.pontos.length)
  })

  it('no modo repetições, o valor do ponto é a maior repetição', () => {
    const evolucao = agregarEvolucao([
      execucao('2026-03-01T10:00:00.000Z', [null, null], { repeticoes: 12 }),
    ])
    expect(evolucao.pontos[0]!.repeticoesMaximas).toBe(12)
    expect(valorDoPonto(evolucao.pontos[0]!, 'repeticoes')).toBe(12)
    expect(unidadeDoModo('repeticoes')).toBe('reps')
  })

  it('no modo carga, o valor do ponto é a maior carga', () => {
    const evolucao = agregarEvolucao([execucao('2026-03-01T10:00:00.000Z', [40, 45])])
    expect(valorDoPonto(evolucao.pontos[0]!, 'carga')).toBe(45)
    expect(unidadeDoModo('carga')).toBe('kg')
  })

  it('a progressão de um exercício sem carga é legível na curva de repetições', () => {
    const { pontos, modo } = agregarEvolucao([
      execucao('2026-03-01T10:00:00.000Z', [null], { repeticoes: 6 }),
      execucao('2026-03-08T10:00:00.000Z', [null], { repeticoes: 8 }),
      execucao('2026-03-15T10:00:00.000Z', [null], { repeticoes: 10 }),
    ])
    expect(modo).toBe('repeticoes')
    expect(pontos.map((p) => valorDoPonto(p, modo))).toEqual([6, 8, 10])
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

  it('o modo é derivado a cada consulta, nunca gravado', () => {
    // Acrescentar carga a um exercício que não tinha muda o modo sozinho — é o
    // dia em que o usuário põe um cinto de lastro na barra fixa.
    const semCarga = [execucao('2026-03-01T10:00:00.000Z', [null])]
    expect(agregarEvolucao(semCarga).modo).toBe('repeticoes')

    const comCarga = [...semCarga, execucao('2026-03-08T10:00:00.000Z', [10])]
    expect(agregarEvolucao(comCarga).modo).toBe('carga')
  })
})

describe('histórico suficiente para a curva (US6, cenário 3)', () => {
  it('um ponto não faz curva', () => {
    const { pontos } = agregarEvolucao([execucao('2026-03-01T10:00:00.000Z', [40])])
    expect(temHistoricoSuficiente(pontos)).toBe(false)
  })

  it('dois pontos já fazem', () => {
    const { pontos } = agregarEvolucao([
      execucao('2026-03-01T10:00:00.000Z', [40]),
      execucao('2026-03-05T10:00:00.000Z', [42.5]),
    ])
    expect(temHistoricoSuficiente(pontos)).toBe(true)
  })

  it('nenhum ponto não faz', () => {
    expect(temHistoricoSuficiente([])).toBe(false)
  })
})
