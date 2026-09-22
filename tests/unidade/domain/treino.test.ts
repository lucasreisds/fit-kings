import { describe, expect, it } from 'vitest'
import {
  mover,
  ordemEhContigua,
  renumerar,
  validarNomeDeTreino,
  validarSeriePlanejada,
  validarTreino,
} from '../../../src/domain/treino'

/** FR-001, FR-007, FR-008, FR-009 — regras de domínio de treino. */

describe('nome do treino (FR-001)', () => {
  it('aceita um nome comum e normaliza o espaço', () => {
    const resultado = validarNomeDeTreino('  Treino   A  ')
    expect(resultado.valido).toBe(true)
    if (resultado.valido) expect(resultado.valor).toBe('Treino A')
  })

  it.each([['vazio', ''], ['só espaço', '   '], ['só quebra de linha', '\n\t']])(
    'recusa nome %s',
    (_caso, entrada) => {
      expect(validarNomeDeTreino(entrada).valido).toBe(false)
    },
  )

  it('recusa nome acima do limite', () => {
    expect(validarNomeDeTreino('a'.repeat(81)).valido).toBe(false)
    expect(validarNomeDeTreino('a'.repeat(80)).valido).toBe(true)
  })
})

describe('ordem dos itens (FR-007)', () => {
  it('aceita a sequência contígua a partir de 1', () => {
    expect(ordemEhContigua([{ ordem: 1 }, { ordem: 2 }, { ordem: 3 }])).toBe(true)
  })

  it('aceita a lista vazia', () => {
    expect(ordemEhContigua([])).toBe(true)
  })

  it('recusa buraco na sequência — viraria exercício pulado sem ninguém pular', () => {
    expect(ordemEhContigua([{ ordem: 1 }, { ordem: 3 }])).toBe(false)
  })

  it('recusa sequência que comece em zero', () => {
    expect(ordemEhContigua([{ ordem: 0 }, { ordem: 1 }])).toBe(false)
  })

  it('recusa ordem duplicada', () => {
    expect(ordemEhContigua([{ ordem: 1 }, { ordem: 1 }])).toBe(false)
  })

  it('aceita a ordem fora de sequência de leitura, desde que o conjunto seja contíguo', () => {
    expect(ordemEhContigua([{ ordem: 3 }, { ordem: 1 }, { ordem: 2 }])).toBe(true)
  })
})

describe('renumerar e mover', () => {
  it('renumera preservando a sequência corrente', () => {
    const itens = [
      { id: 'c', ordem: 9 },
      { id: 'a', ordem: 2 },
      { id: 'b', ordem: 5 },
    ]
    expect(renumerar(itens)).toEqual([
      { id: 'a', ordem: 1 },
      { id: 'b', ordem: 2 },
      { id: 'c', ordem: 3 },
    ])
  })

  it('move um item para cima e renumera', () => {
    const itens = [
      { id: 'a', ordem: 1 },
      { id: 'b', ordem: 2 },
      { id: 'c', ordem: 3 },
    ]
    expect(mover(itens, 2, 0).map((i) => i.id)).toEqual(['c', 'a', 'b'])
    expect(mover(itens, 2, 0).map((i) => i.ordem)).toEqual([1, 2, 3])
  })

  it('move um item para baixo', () => {
    const itens = [
      { id: 'a', ordem: 1 },
      { id: 'b', ordem: 2 },
      { id: 'c', ordem: 3 },
    ]
    expect(mover(itens, 0, 2).map((i) => i.id)).toEqual(['b', 'c', 'a'])
  })

  it('ignora índice fora da lista sem corromper a ordem', () => {
    const itens = [
      { id: 'a', ordem: 1 },
      { id: 'b', ordem: 2 },
    ]
    expect(mover(itens, 5, 0).map((i) => i.id)).toEqual(['a', 'b'])
    expect(ordemEhContigua(mover(itens, 5, 0))).toBe(true)
  })

  it('não altera o array recebido', () => {
    const itens = [
      { id: 'a', ordem: 1 },
      { id: 'b', ordem: 2 },
    ]
    mover(itens, 0, 1)
    expect(itens.map((i) => i.id)).toEqual(['a', 'b'])
  })
})

describe('série planejada (FR-008, FR-009)', () => {
  it('aceita valores comuns', () => {
    expect(validarSeriePlanejada({ repeticoes: 8, cargaKg: 40, rir: 2 }).valido).toBe(true)
  })

  it('aceita carga zero — peso corporal', () => {
    expect(validarSeriePlanejada({ repeticoes: 12, cargaKg: 0, rir: null }).valido).toBe(true)
  })

  it('aceita carga fracionada', () => {
    expect(validarSeriePlanejada({ repeticoes: 10, cargaKg: 2.5, rir: 0 }).valido).toBe(true)
  })

  it('aceita RIR nulo — não planejado', () => {
    expect(validarSeriePlanejada({ repeticoes: 10, cargaKg: 20, rir: null }).valido).toBe(true)
  })

  it.each([
    ['repetições zero', { repeticoes: 0, cargaKg: 20, rir: null }],
    ['repetições negativas', { repeticoes: -3, cargaKg: 20, rir: null }],
    ['repetições fracionadas', { repeticoes: 8.5, cargaKg: 20, rir: null }],
    ['carga negativa', { repeticoes: 8, cargaKg: -1, rir: null }],
    ['RIR negativo', { repeticoes: 8, cargaKg: 20, rir: -1 }],
    ['RIR fracionado', { repeticoes: 8, cargaKg: 20, rir: 1.5 }],
  ])('recusa %s', (_caso, valores) => {
    expect(validarSeriePlanejada(valores).valido).toBe(false)
  })
})

describe('treino completo', () => {
  const serie = { repeticoes: 8, cargaKg: 40, rir: 2 }

  it('aceita treino bem formado', () => {
    const resultado = validarTreino({
      nome: 'Treino A',
      itens: [
        { ordem: 1, exercicioId: 'ex-1', abordagem: 'tradicional', series: [serie, serie] },
        { ordem: 2, exercicioId: 'ex-2', abordagem: 'dropset', series: [serie] },
      ],
    })
    expect(resultado.valido).toBe(true)
  })

  it('aceita treino sem exercícios — montar é incremental', () => {
    expect(validarTreino({ nome: 'Treino A', itens: [] }).valido).toBe(true)
  })

  it('aponta o campo exato do problema dentro do item', () => {
    const resultado = validarTreino({
      nome: 'Treino A',
      itens: [
        { ordem: 1, exercicioId: 'ex-1', abordagem: 'tradicional', series: [serie] },
        {
          ordem: 2,
          exercicioId: 'ex-2',
          abordagem: 'tradicional',
          series: [{ repeticoes: 0, cargaKg: 10, rir: null }],
        },
      ],
    })
    expect(resultado.valido).toBe(false)
    if (!resultado.valido) {
      expect(resultado.problemas.map((p) => p.campo)).toContain('itens[1].series[0].repeticoes')
    }
  })

  it('recusa item sem nenhuma série planejada', () => {
    const resultado = validarTreino({
      nome: 'Treino A',
      itens: [{ ordem: 1, exercicioId: 'ex-1', abordagem: 'tradicional', series: [] }],
    })
    expect(resultado.valido).toBe(false)
  })

  it('acumula os problemas em vez de parar no primeiro', () => {
    const resultado = validarTreino({
      nome: '',
      itens: [{ ordem: 7, exercicioId: '', abordagem: 'tradicional', series: [] }],
    })
    expect(resultado.valido).toBe(false)
    if (!resultado.valido) expect(resultado.problemas.length).toBeGreaterThanOrEqual(3)
  })
})

/**
 * T029 — FR-143. A validação do intervalo no planejamento é a mesma regra que
 * a importação aplica: `validarIntervalo` vive num lugar só, e duplicá-la
 * abriria espaço para as duas divergirem.
 */
describe('intervalo de repetições no planejamento (FR-143)', () => {
  it('aceita série sem máximo — o valor único de sempre', () => {
    expect(validarSeriePlanejada({ repeticoes: 8, cargaKg: 40, rir: 2 }).valido).toBe(true)
  })

  it('aceita intervalo bem formado', () => {
    expect(
      validarSeriePlanejada({ repeticoes: 6, repeticoesMax: 8, cargaKg: 40, rir: 2 }).valido,
    ).toBe(true)
  })

  it('aceita pontas iguais', () => {
    expect(
      validarSeriePlanejada({ repeticoes: 8, repeticoesMax: 8, cargaKg: 40, rir: null }).valido,
    ).toBe(true)
  })

  it('recusa mínimo maior que o máximo', () => {
    const resultado = validarSeriePlanejada({
      repeticoes: 8,
      repeticoesMax: 6,
      cargaKg: 40,
      rir: null,
    })
    expect(resultado.valido).toBe(false)
    if (!resultado.valido) {
      expect(resultado.problemas[0]!.campo).toBe('repeticoesMax')
    }
  })

  it('recusa máximo fracionado ou zero', () => {
    expect(
      validarSeriePlanejada({ repeticoes: 6, repeticoesMax: 8.5, cargaKg: 40, rir: null }).valido,
    ).toBe(false)
    expect(
      validarSeriePlanejada({ repeticoes: 6, repeticoesMax: 0, cargaKg: 40, rir: null }).valido,
    ).toBe(false)
  })

  it('o treino inteiro aponta o campo exato do intervalo inválido', () => {
    const resultado = validarTreino({
      nome: 'Treino A',
      itens: [
        {
          ordem: 1,
          exercicioId: 'ex-1',
          abordagem: 'tradicional',
          series: [{ repeticoes: 10, repeticoesMax: 6, cargaKg: 40, rir: null }],
        },
      ],
    })
    expect(resultado.valido).toBe(false)
    if (!resultado.valido) {
      expect(resultado.problemas.map((p) => p.campo)).toContain('itens[0].series[0].repeticoesMax')
    }
  })
})
