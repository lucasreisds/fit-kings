import { describe, expect, it } from 'vitest'
import {
  CARGA_HERDADA,
  cargaDigitada,
  cargaEfetiva,
} from '../../../src/domain/serie/campoDeCarga'

describe('campo de carga (FR-167)', () => {
  it('sem toque do usuário, vale a carga herdada', () => {
    expect(cargaEfetiva(CARGA_HERDADA, 45)).toBe(45)
  })

  it('sem toque e sem herança, não há carga', () => {
    expect(cargaEfetiva(CARGA_HERDADA, null)).toBeNull()
  })

  it('o que o usuário digitou prevalece sobre a herança', () => {
    expect(cargaEfetiva(cargaDigitada(50), 45)).toBe(50)
  })

  it('aceita fração, que é como metade das anilhas existe', () => {
    expect(cargaEfetiva(cargaDigitada(47.5), 45)).toBe(47.5)
  })

  /**
   * É o defeito, em uma linha.
   *
   * Antes, apagar o campo devolvia `null`, e `null ?? 45` fazia a herança
   * voltar no mesmo instante. Chegar a 50 partindo de 45 era impossível.
   */
  it('apagar o campo não faz a herança voltar (FR-168)', () => {
    expect(cargaEfetiva(cargaDigitada(null), 45)).toBeNull()
  })

  it('zero é carga digitada, não campo vazio', () => {
    expect(cargaEfetiva(cargaDigitada(0), 45)).toBe(0)
  })
})
