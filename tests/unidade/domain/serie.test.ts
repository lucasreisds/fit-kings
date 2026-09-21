import { describe, expect, it } from 'vitest'
import {
  compararSerie,
  serieEhValida,
  seriesValidas,
  temAlgumaSerieValida,
} from '../../../src/domain/serie/validade'

/**
 * FR-092 — série válida é a que tem repetições registradas **e** não está
 * marcada como não realizada.
 *
 * A definição é consultada por três regras diferentes (FR-043, FR-094, FR-125).
 * Um erro aqui se propaga para as três.
 */
describe('série válida (FR-092)', () => {
  it('é válida com repetições registradas e sem marcação', () => {
    expect(serieEhValida({ repeticoes: 8, naoRealizada: false })).toBe(true)
  })

  it('zero repetições registradas é registro, e portanto válida', () => {
    // Zero é diferente de ausente: o usuário tentou e não conseguiu nenhuma.
    expect(serieEhValida({ repeticoes: 0, naoRealizada: false })).toBe(true)
  })

  it('não é válida sem repetições registradas', () => {
    expect(serieEhValida({ repeticoes: null, naoRealizada: false })).toBe(false)
  })

  it('não é válida quando marcada como não realizada, mesmo com repetições', () => {
    expect(serieEhValida({ repeticoes: 8, naoRealizada: true })).toBe(false)
  })

  it('não é válida sem repetições e marcada', () => {
    expect(serieEhValida({ repeticoes: null, naoRealizada: true })).toBe(false)
  })

  it('filtra e detecta em lote', () => {
    const series = [
      { repeticoes: 8, naoRealizada: false },
      { repeticoes: null, naoRealizada: false },
      { repeticoes: 10, naoRealizada: true },
      { repeticoes: 6, naoRealizada: false },
    ]
    expect(seriesValidas(series)).toHaveLength(2)
    expect(temAlgumaSerieValida(series)).toBe(true)
    expect(temAlgumaSerieValida([])).toBe(false)
    expect(temAlgumaSerieValida([{ repeticoes: null, naoRealizada: true }])).toBe(false)
  })
})

describe('comparação planejado x realizado (FR-020, FR-019)', () => {
  const planejado = { repeticoes: 8, cargaKg: 40, rir: 2 }

  it('marca acima, igual e abaixo', () => {
    expect(
      compararSerie(planejado, { repeticoes: 9, cargaKg: 40, rir: 2, naoRealizada: false })
        .repeticoes,
    ).toBe('acima')
    expect(
      compararSerie(planejado, { repeticoes: 8, cargaKg: 40, rir: 2, naoRealizada: false })
        .repeticoes,
    ).toBe('igual')
    expect(
      compararSerie(planejado, { repeticoes: 7, cargaKg: 40, rir: 2, naoRealizada: false })
        .repeticoes,
    ).toBe('abaixo')
  })

  it('distingue não realizada de sem registro (FR-024)', () => {
    expect(compararSerie(planejado, null).repeticoes).toBe('sem_registro')
    expect(
      compararSerie(planejado, { repeticoes: null, cargaKg: null, rir: null, naoRealizada: true })
        .repeticoes,
    ).toBe('nao_realizada')
  })

  it('série sem meta — extra ou fora do plano — não é comparada', () => {
    const comparacao = compararSerie(null, {
      repeticoes: 12,
      cargaKg: 20,
      rir: null,
      naoRealizada: false,
    })
    expect(comparacao).toEqual({ repeticoes: 'sem_meta', carga: 'sem_meta', rir: 'sem_meta' })
  })

  it('trata RIR planejado e realizado como dados independentes (FR-019)', () => {
    // RIR planejado ausente não impede comparar repetições e carga.
    const comparacao = compararSerie(
      { repeticoes: 8, cargaKg: 40, rir: null },
      { repeticoes: 9, cargaKg: 42.5, rir: 1, naoRealizada: false },
    )
    expect(comparacao.repeticoes).toBe('acima')
    expect(comparacao.carga).toBe('acima')
    expect(comparacao.rir).toBe('sem_meta')
  })

  it('RIR realizado ausente é registro incompleto, não comparação (FR-029)', () => {
    const comparacao = compararSerie(planejado, {
      repeticoes: 8,
      cargaKg: 40,
      rir: null,
      naoRealizada: false,
    })
    expect(comparacao.repeticoes).toBe('igual')
    expect(comparacao.rir).toBe('sem_registro')
  })
})
