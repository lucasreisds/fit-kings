import { describe, expect, it } from 'vitest'
import { formatarReferencia } from '../../../src/plataforma/formato'

/** T009 — formato da referência da última vez (FR-194). */
describe('formatarReferencia', () => {
  it.each([
    [{ repeticoes: 10, cargaKg: 40 }, '40 kg × 10'],
    [{ repeticoes: 10, cargaKg: 42.5 }, '42,5 kg × 10'],
    [{ repeticoes: 12, cargaKg: 0 }, '12 reps'],
    [{ repeticoes: 12, cargaKg: null }, '12 reps'],
  ])('%o → "%s"', (referencia, esperado) => {
    expect(formatarReferencia(referencia)).toBe(esperado)
  })
})
