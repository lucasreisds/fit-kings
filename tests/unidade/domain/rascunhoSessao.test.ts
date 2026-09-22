import { describe, expect, it } from 'vitest'
import {
  renumerarAposRemocao,
  validarCorrecaoDeRascunho,
  type MetaPorPosicao,
} from '../../../src/domain/sessao/rascunho'
import { umaSerieRealizada } from '../../apoio/fabricas'

/**
 * T013 — FR-135.
 *
 * A renumeração é a parte visível; a **re-vinculação à meta** é a que importa.
 * Se o usuário fez três séries e apaga a segunda, sobram duas — e elas cumprem
 * a primeira e a segunda meta. Manter o vínculo antigo faria a segunda série
 * restante comparar-se com a terceira meta, e o estado do exercício ficaria
 * incoerente com a comparação exibida.
 */

const METAS: MetaPorPosicao[] = [
  { ordem: 1, seriePlanejadaId: 'meta-1' },
  { ordem: 2, seriePlanejadaId: 'meta-2' },
  { ordem: 3, seriePlanejadaId: 'meta-3' },
]

function serie(ordem: number, seriePlanejadaId: string | null) {
  return umaSerieRealizada({ ordem, seriePlanejadaId })
}

describe('renumeração após remoção (FR-135)', () => {
  it('renumera de forma contígua a partir de 1', () => {
    const restantes = [serie(1, 'meta-1'), serie(3, 'meta-3')]
    expect(renumerarAposRemocao(restantes, METAS).map((s) => s.ordem)).toEqual([1, 2])
  })

  it('re-vincula cada série à meta da nova posição', () => {
    // Removida a série 2: a que era 3 passa a cumprir a meta 2.
    const restantes = [serie(1, 'meta-1'), serie(3, 'meta-3')]
    expect(renumerarAposRemocao(restantes, METAS).map((s) => s.seriePlanejadaId)).toEqual([
      'meta-1',
      'meta-2',
    ])
  })

  it('remover a primeira desloca todas', () => {
    const restantes = [serie(2, 'meta-2'), serie(3, 'meta-3')]
    const renumeradas = renumerarAposRemocao(restantes, METAS)
    expect(renumeradas.map((s) => s.ordem)).toEqual([1, 2])
    expect(renumeradas.map((s) => s.seriePlanejadaId)).toEqual(['meta-1', 'meta-2'])
  })

  it('série sem meta continua sem meta, mesmo caindo dentro do planejado', () => {
    // Uma série extra foi registrada como extra. Renumerar não pode transformá-la
    // em série planejada — seria inventar história.
    const restantes = [serie(1, 'meta-1'), serie(4, null)]
    const renumeradas = renumerarAposRemocao(restantes, METAS)
    expect(renumeradas.map((s) => s.ordem)).toEqual([1, 2])
    expect(renumeradas[1]!.seriePlanejadaId).toBeNull()
  })

  it('mais séries que metas: as excedentes ficam sem meta', () => {
    const restantes = [serie(1, 'meta-1'), serie(2, 'meta-2'), serie(3, 'meta-3'), serie(4, 'x')]
    const renumeradas = renumerarAposRemocao(restantes, METAS)
    expect(renumeradas[3]!.seriePlanejadaId).toBeNull()
  })

  it('exercício fora do plano: sem metas, todas ficam sem vínculo', () => {
    const restantes = [serie(1, null), serie(3, null)]
    const renumeradas = renumerarAposRemocao(restantes, [])
    expect(renumeradas.map((s) => s.ordem)).toEqual([1, 2])
    expect(renumeradas.every((s) => s.seriePlanejadaId === null)).toBe(true)
  })

  it('lista vazia devolve lista vazia', () => {
    expect(renumerarAposRemocao([], METAS)).toEqual([])
  })

  it('não altera o que recebeu', () => {
    const restantes = [serie(1, 'meta-1'), serie(3, 'meta-3')]
    const copia = structuredClone(restantes)
    renumerarAposRemocao(restantes, METAS)
    expect(restantes).toEqual(copia)
  })

  it('preserva tudo o que não é ordem nem vínculo', () => {
    const original = umaSerieRealizada({
      ordem: 3,
      seriePlanejadaId: 'meta-3',
      cargaKg: 42.5,
      repeticoes: 9,
      rir: 1,
      naoRealizada: false,
    })
    const [renumerada] = renumerarAposRemocao([original], METAS)
    expect(renumerada).toMatchObject({
      id: original.id,
      cargaKg: 42.5,
      repeticoes: 9,
      rir: 1,
      naoRealizada: false,
      criadoEm: original.criadoEm,
    })
  })
})

describe('validação da correção de rascunho', () => {
  it('aceita valores comuns e nulos', () => {
    expect(validarCorrecaoDeRascunho({ cargaKg: 40, repeticoes: 8, rir: 2 })).toEqual([])
    expect(validarCorrecaoDeRascunho({ cargaKg: null, repeticoes: null, rir: null })).toEqual([])
    expect(validarCorrecaoDeRascunho({})).toEqual([])
  })

  it('aceita carga zero — peso corporal', () => {
    expect(validarCorrecaoDeRascunho({ cargaKg: 0 })).toEqual([])
  })

  it('aceita zero repetições — tentou e não conseguiu nenhuma', () => {
    expect(validarCorrecaoDeRascunho({ repeticoes: 0 })).toEqual([])
  })

  it.each([
    ['repetições negativas', { repeticoes: -1 }],
    ['repetições fracionadas', { repeticoes: 8.5 }],
    ['carga negativa', { cargaKg: -5 }],
    ['RIR negativo', { rir: -1 }],
    ['RIR fracionado', { rir: 1.5 }],
  ])('recusa %s', (_caso, correcao) => {
    expect(validarCorrecaoDeRascunho(correcao).length).toBeGreaterThan(0)
  })
})
