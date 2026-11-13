import { describe, expect, it } from 'vitest'
import { espelhar } from '../../../src/domain/treino'
import type { ValoresPlanejados } from '../../../src/domain/treino'

/**
 * T001 — FR-187 a FR-190.
 *
 * "Acompanhar a primeira" é **estar igual a ela no instante da alteração**.
 * Não existe marca guardada, e por isso cada caso aqui parte só da lista de
 * séries — que é tudo o que a regra enxerga.
 */
const BASE: ValoresPlanejados = { repeticoes: 10, repeticoesMax: null, cargaKg: 0, rir: null }

function quatroIguais(): ValoresPlanejados[] {
  return [{ ...BASE }, { ...BASE }, { ...BASE }, { ...BASE }]
}

describe('espelhar a primeira série planejada', () => {
  it.each([
    ['repeticoes', 8],
    ['repeticoesMax', 12],
    ['cargaKg', 42.5],
    ['rir', 2],
  ] as const)('alterar "%s" da série 1 leva junto as idênticas (FR-187)', (campo, valor) => {
    const resultado = espelhar(quatroIguais(), 0, campo, valor)
    for (const serie of resultado) expect(serie[campo]).toBe(valor)
  })

  it('série com um único campo diferente não acompanha (FR-188)', () => {
    const atuais = quatroIguais()
    atuais[3] = { ...BASE, rir: 1 }

    const resultado = espelhar(atuais, 0, 'cargaKg', 40)

    expect(resultado.map((s) => s.cargaKg)).toEqual([40, 40, 40, 0])
    expect(resultado[3]).toEqual({ ...BASE, rir: 1 })
  })

  it('alterar uma série que não é a primeira afeta só ela (FR-189)', () => {
    const resultado = espelhar(quatroIguais(), 2, 'cargaKg', 35)
    expect(resultado.map((s) => s.cargaKg)).toEqual([0, 0, 35, 0])
  })

  it('não existe cadeia: alterar a 2 não leva a 3', () => {
    const resultado = espelhar(quatroIguais(), 1, 'repeticoes', 6)
    expect(resultado.map((s) => s.repeticoes)).toEqual([10, 6, 10, 10])
  })

  it('série que volta a ficar igual à primeira passa a acompanhar (FR-190)', () => {
    let series: readonly ValoresPlanejados[] = quatroIguais()
    series = espelhar(series, 0, 'cargaKg', 40)
    series = espelhar(series, 3, 'cargaKg', 35)
    series = espelhar(series, 0, 'cargaKg', 35) // a 1 encontra a 4
    series = espelhar(series, 0, 'cargaKg', 50)

    expect(series.map((s) => s.cargaKg)).toEqual([50, 50, 50, 50])
  })

  it('digitar "40" tecla a tecla leva as demais junto a cada tecla', () => {
    let series: readonly ValoresPlanejados[] = quatroIguais()
    series = espelhar(series, 0, 'cargaKg', 4)
    series = espelhar(series, 0, 'cargaKg', 40)
    expect(series.map((s) => s.cargaKg)).toEqual([40, 40, 40, 40])
  })

  it('propaga nulo em campo opcional', () => {
    const atuais = quatroIguais().map((s) => ({ ...s, rir: 2 }))
    const resultado = espelhar(atuais, 0, 'rir', null)
    expect(resultado.map((s) => s.rir)).toEqual([null, null, null, null])
  })

  it('máximo ausente e máximo nulo são o mesmo valor', () => {
    const atuais: ValoresPlanejados[] = [
      { repeticoes: 8, cargaKg: 40, rir: 2 },
      { repeticoes: 8, repeticoesMax: null, cargaKg: 40, rir: 2 },
    ]
    const resultado = espelhar(atuais, 0, 'cargaKg', 45)
    expect(resultado[1]!.cargaKg).toBe(45)
  })

  it('lista de uma série só', () => {
    expect(espelhar([{ ...BASE }], 0, 'repeticoes', 12)).toEqual([{ ...BASE, repeticoes: 12 }])
  })

  it('índice fora do intervalo devolve a entrada intacta', () => {
    const atuais = quatroIguais()
    expect(espelhar(atuais, 7, 'cargaKg', 40)).toEqual(atuais)
    expect(espelhar(atuais, -1, 'cargaKg', 40)).toEqual(atuais)
  })

  it('não muta a lista recebida', () => {
    const atuais = quatroIguais()
    const copia = structuredClone(atuais)
    espelhar(atuais, 0, 'cargaKg', 40)
    expect(atuais).toEqual(copia)
  })
})
