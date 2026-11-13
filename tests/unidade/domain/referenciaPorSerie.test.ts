import { describe, expect, it } from 'vitest'
import { referenciasPorSerie } from '../../../src/domain/serie/referencia'
import { umaSerieRealizada } from '../../apoio/fabricas'

/** T008 — FR-194, FR-197. */
describe('referência por série da última vez', () => {
  it('cada série válida vira referência pelo seu número', () => {
    const referencias = referenciasPorSerie([
      umaSerieRealizada({ ordem: 1, repeticoes: 10, cargaKg: 40 }),
      umaSerieRealizada({ ordem: 2, repeticoes: 9, cargaKg: 40 }),
      umaSerieRealizada({ ordem: 3, repeticoes: 8, cargaKg: 42.5 }),
    ])

    expect([...referencias]).toEqual([
      [1, { repeticoes: 10, cargaKg: 40 }],
      [2, { repeticoes: 9, cargaKg: 40 }],
      [3, { repeticoes: 8, cargaKg: 42.5 }],
    ])
  })

  it('série não realizada não é referência (FR-197)', () => {
    const referencias = referenciasPorSerie([
      umaSerieRealizada({ ordem: 1, repeticoes: 10, cargaKg: 40 }),
      umaSerieRealizada({ ordem: 2, repeticoes: null, cargaKg: null, naoRealizada: true }),
    ])
    expect(referencias.has(2)).toBe(false)
    expect(referencias.has(1)).toBe(true)
  })

  it('série sem repetições não é referência (FR-197)', () => {
    const referencias = referenciasPorSerie([
      umaSerieRealizada({ ordem: 1, repeticoes: null, cargaKg: 40 }),
    ])
    expect(referencias.size).toBe(0)
  })

  it('carga não informada é preservada como nula', () => {
    const referencias = referenciasPorSerie([
      umaSerieRealizada({ ordem: 1, repeticoes: 12, cargaKg: null }),
    ])
    expect(referencias.get(1)).toEqual({ repeticoes: 12, cargaKg: null })
  })

  it('dropset usa o primeiro degrau, não a soma', () => {
    const referencias = referenciasPorSerie([
      umaSerieRealizada({
        ordem: 1,
        repeticoes: 18,
        cargaKg: 40,
        degraus: [
          { ordem: 1, cargaKg: 40, repeticoes: 10 },
          { ordem: 2, cargaKg: 30, repeticoes: 8 },
        ],
      }),
    ])
    expect(referencias.get(1)).toEqual({ repeticoes: 10, cargaKg: 40 })
  })

  it('nenhuma série, nenhuma referência', () => {
    expect(referenciasPorSerie([]).size).toBe(0)
  })
})
