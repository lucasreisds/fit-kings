import { describe, expect, it } from 'vitest'
import { cargaHerdada } from '../../../src/domain/serie/heranca'

/**
 * FR-085, FR-082, FR-119, Princípio II.
 *
 * O que estes testes protegem é sobretudo o que a herança **não** faz. O erro
 * fácil aqui é pré-preencher a primeira série a partir do plano ou do histórico,
 * que parece prestativo e é proibido: a carga de hoje é decisão de hoje.
 */
describe('herança de carga dentro da sessão', () => {
  it('herda a carga da série anterior do mesmo exercício', () => {
    const registradas = [{ ordem: 1, cargaKg: 40 }]
    expect(cargaHerdada(registradas, 2)).toBe(40)
  })

  it('herda a mais recente quando há várias', () => {
    const registradas = [
      { ordem: 1, cargaKg: 40 },
      { ordem: 2, cargaKg: 42.5 },
    ]
    expect(cargaHerdada(registradas, 3)).toBe(42.5)
  })

  it('não alcança a primeira série de um exercício (FR-082)', () => {
    // Mesmo havendo série registrada em outro lugar, a primeira vem vazia.
    expect(cargaHerdada([{ ordem: 1, cargaKg: 40 }], 1)).toBeNull()
    expect(cargaHerdada([], 1)).toBeNull()
  })

  it('não atravessa exercícios — a função só recebe as séries do exercício corrente', () => {
    // A carga do exercício anterior não entra nesta lista por construção: a
    // assinatura não tem como recebê-la.
    expect(cargaHerdada([], 2)).toBeNull()
  })

  it('pula série anterior sem carga informada', () => {
    const registradas = [
      { ordem: 1, cargaKg: 40 },
      { ordem: 2, cargaKg: null },
    ]
    expect(cargaHerdada(registradas, 3)).toBe(40)
  })

  it('devolve nulo quando nenhuma série anterior tem carga', () => {
    expect(cargaHerdada([{ ordem: 1, cargaKg: null }], 2)).toBeNull()
  })

  it('ignora séries de ordem maior que a corrente', () => {
    const registradas = [
      { ordem: 1, cargaKg: 40 },
      { ordem: 5, cargaKg: 90 },
    ]
    expect(cargaHerdada(registradas, 2)).toBe(40)
  })

  it('carga zero é herdada — peso corporal é valor, não ausência', () => {
    expect(cargaHerdada([{ ordem: 1, cargaKg: 0 }], 2)).toBe(0)
  })

  it('é função pura', () => {
    const registradas = [{ ordem: 1, cargaKg: 40 }]
    expect(cargaHerdada(registradas, 2)).toBe(cargaHerdada(registradas, 2))
  })
})
