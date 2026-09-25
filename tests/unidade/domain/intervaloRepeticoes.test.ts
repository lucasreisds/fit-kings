import { describe, expect, it } from 'vitest'
import {
  ehPontaUnica,
  formatarIntervalo,
  intervaloDe,
  posicaoNoIntervalo,
  superouIntervalo,
  validarIntervalo,
} from '../../../src/domain/serie/intervalo'

/**
 * T026 — FR-139 a FR-143.
 *
 * O ponto central: **o valor único é um intervalo de pontas coincidentes**, não
 * um caso paralelo. Os testes verificam a generalização e, sobretudo, que ela
 * se reduz exatamente ao comportamento anterior quando não há faixa.
 */
describe('resolução do intervalo (FR-140)', () => {
  it('máximo nulo significa ponta única', () => {
    const intervalo = intervaloDe({ repeticoes: 8, repeticoesMax: null })
    expect(intervalo).toEqual({ minimo: 8, maximo: 8 })
    expect(ehPontaUnica(intervalo)).toBe(true)
  })

  it('máximo presente forma a faixa', () => {
    const intervalo = intervaloDe({ repeticoes: 6, repeticoesMax: 8 })
    expect(intervalo).toEqual({ minimo: 6, maximo: 8 })
    expect(ehPontaUnica(intervalo)).toBe(false)
  })

  it('pontas iguais são ponta única, escrita de forma explícita', () => {
    expect(ehPontaUnica(intervaloDe({ repeticoes: 8, repeticoesMax: 8 }))).toBe(true)
  })
})

// FR-160 substitui a regra original de FR-141/FR-142: numa faixa, o topo não é
// só mais um ponto "dentro" — é o fim do ciclo de repetições, e é ele que manda
// subir a carga. Os casos de ponta única continuam valendo palavra por palavra.
describe('posição no intervalo (FR-141, revisto por FR-160)', () => {
  const SEIS_A_OITO = intervaloDe({ repeticoes: 6, repeticoesMax: 8 })

  it.each([
    [5, 'abaixo'],
    [6, 'dentro'],
    [7, 'dentro'],
    [8, 'no_topo'],
    [9, 'acima'],
  ] as const)('%i repetições em 6-8 é %s', (realizado, esperado) => {
    expect(posicaoNoIntervalo(realizado, SEIS_A_OITO)).toBe(esperado)
  })

  it('as pontas continuam dentro da meta: nenhuma delas é "acima"', () => {
    expect(posicaoNoIntervalo(6, SEIS_A_OITO)).toBe('dentro')
    expect(posicaoNoIntervalo(8, SEIS_A_OITO)).toBe('no_topo')
  })

  it('com ponta única, "dentro" é o antigo "igual"', () => {
    const oito = intervaloDe({ repeticoes: 8, repeticoesMax: null })
    expect(posicaoNoIntervalo(7, oito)).toBe('abaixo')
    expect(posicaoNoIntervalo(8, oito)).toBe('dentro')
    expect(posicaoNoIntervalo(9, oito)).toBe('acima')
  })
})

describe('superar o intervalo (FR-142, revisto por FR-160)', () => {
  const SEIS_A_OITO = intervaloDe({ repeticoes: 6, repeticoesMax: 8 })

  it('supera quem passa do máximo', () => {
    expect(superouIntervalo(9, SEIS_A_OITO)).toBe(true)
  })

  it('alcançar o topo da faixa já é o gatilho para subir a carga', () => {
    expect(superouIntervalo(8, SEIS_A_OITO)).toBe(true)
  })

  it('dentro e abaixo não superam', () => {
    expect(superouIntervalo(7, SEIS_A_OITO)).toBe(false)
    expect(superouIntervalo(6, SEIS_A_OITO)).toBe(false)
    expect(superouIntervalo(5, SEIS_A_OITO)).toBe(false)
  })

  it('com ponta única, a regra é a de sempre: estritamente maior', () => {
    const oito = intervaloDe({ repeticoes: 8, repeticoesMax: null })
    expect(superouIntervalo(9, oito)).toBe(true)
    expect(superouIntervalo(8, oito)).toBe(false)
  })
})

describe('validação (FR-143)', () => {
  it('aceita ponta única', () => {
    expect(validarIntervalo({ repeticoes: 8, repeticoesMax: null })).toEqual([])
  })

  it('aceita faixa bem formada', () => {
    expect(validarIntervalo({ repeticoes: 6, repeticoesMax: 8 })).toEqual([])
  })

  it('aceita pontas iguais', () => {
    expect(validarIntervalo({ repeticoes: 8, repeticoesMax: 8 })).toEqual([])
  })

  it('recusa mínimo maior que o máximo', () => {
    const problemas = validarIntervalo({ repeticoes: 8, repeticoesMax: 6 })
    expect(problemas).toHaveLength(1)
    expect(problemas[0]!.mensagem).toMatch(/não pode ser menor que o mínimo/)
  })

  it.each([
    ['mínimo zero', { repeticoes: 0, repeticoesMax: null }],
    ['mínimo fracionado', { repeticoes: 6.5, repeticoesMax: 8 }],
    ['máximo zero', { repeticoes: 6, repeticoesMax: 0 }],
    ['máximo fracionado', { repeticoes: 6, repeticoesMax: 8.5 }],
  ])('recusa %s', (_caso, planejado) => {
    expect(validarIntervalo(planejado).length).toBeGreaterThan(0)
  })
})

describe('formatação', () => {
  it('ponta única aparece como número', () => {
    expect(formatarIntervalo(intervaloDe({ repeticoes: 8, repeticoesMax: null }))).toBe('8')
  })

  it('faixa aparece como 6-8', () => {
    expect(formatarIntervalo(intervaloDe({ repeticoes: 6, repeticoesMax: 8 }))).toBe('6-8')
  })
})
