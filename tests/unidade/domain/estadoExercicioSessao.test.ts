import { describe, expect, it } from 'vitest'
import {
  contaComoExecucao,
  estadoExercicioSessao,
  textoDoEstado,
  type EstadoExercicioSessao,
} from '../../../src/domain/sessao/estadoExercicio'

/**
 * T129 — FR-125, FR-126, Princípio V.
 *
 * Casos de fronteira exigidos pelo Princípio V, que não considera concluída
 * nenhuma regra de domínio sem eles. O caso que mais importa é o último: a
 * combinação de marcação ativa com série válida **tem** de sair como estado
 * inconsistente explícito, nunca resolvida em silêncio a favor de um dos dois.
 */

const VALIDA = { repeticoes: 8, naoRealizada: false }
const SEM_REPETICOES = { repeticoes: null, naoRealizada: false }
const MARCADA = { repeticoes: null, naoRealizada: true }

describe('estadoExercicioSessao (FR-125)', () => {
  it('nenhuma série e sem marcação → não alcançado', () => {
    expect(
      estadoExercicioSessao({ series: [], naoRealizado: false, seriesPlanejadas: 3 }),
    ).toBe<EstadoExercicioSessao>('nao_alcancado')
  })

  it('nenhuma série e marcação ativa → não realizado', () => {
    // Estes dois casos têm exatamente as mesmas séries — nenhuma. Só a marcação
    // os distingue, que é a razão de ela ser persistida (FR-125).
    expect(
      estadoExercicioSessao({ series: [], naoRealizado: true, seriesPlanejadas: 3 }),
    ).toBe<EstadoExercicioSessao>('nao_realizado')
  })

  it('todas as séries planejadas válidas → realizado', () => {
    expect(
      estadoExercicioSessao({
        series: [VALIDA, VALIDA, VALIDA],
        naoRealizado: false,
        seriesPlanejadas: 3,
      }),
    ).toBe<EstadoExercicioSessao>('realizado')
  })

  it('parte das planejadas válida → parcial', () => {
    expect(
      estadoExercicioSessao({
        series: [VALIDA, VALIDA],
        naoRealizado: false,
        seriesPlanejadas: 3,
      }),
    ).toBe<EstadoExercicioSessao>('parcial')
  })

  it('uma de três → parcial', () => {
    expect(
      estadoExercicioSessao({ series: [VALIDA], naoRealizado: false, seriesPlanejadas: 3 }),
    ).toBe<EstadoExercicioSessao>('parcial')
  })

  it('série extra não altera o estado', () => {
    expect(
      estadoExercicioSessao({
        series: [VALIDA, VALIDA, VALIDA, VALIDA],
        naoRealizado: false,
        seriesPlanejadas: 3,
      }),
    ).toBe<EstadoExercicioSessao>('realizado')
  })

  it('série marcada como não realizada não conta como válida', () => {
    expect(
      estadoExercicioSessao({
        series: [VALIDA, VALIDA, { repeticoes: 8, naoRealizada: true }],
        naoRealizado: false,
        seriesPlanejadas: 3,
      }),
    ).toBe<EstadoExercicioSessao>('parcial')
  })

  it('série sem repetições registradas não conta como válida', () => {
    expect(
      estadoExercicioSessao({
        series: [VALIDA, SEM_REPETICOES, SEM_REPETICOES],
        naoRealizado: false,
        seriesPlanejadas: 3,
      }),
    ).toBe<EstadoExercicioSessao>('parcial')
  })

  it('só séries sem repetições → não alcançado, não parcial', () => {
    expect(
      estadoExercicioSessao({
        series: [SEM_REPETICOES, SEM_REPETICOES],
        naoRealizado: false,
        seriesPlanejadas: 3,
      }),
    ).toBe<EstadoExercicioSessao>('nao_alcancado')
  })

  it('exercício fora do plano: qualquer série válida basta para realizado (FR-088)', () => {
    expect(
      estadoExercicioSessao({ series: [VALIDA], naoRealizado: false, seriesPlanejadas: 0 }),
    ).toBe<EstadoExercicioSessao>('realizado')
  })

  it('exercício fora do plano sem série ainda é não alcançado', () => {
    expect(
      estadoExercicioSessao({ series: [], naoRealizado: false, seriesPlanejadas: 0 }),
    ).toBe<EstadoExercicioSessao>('nao_alcancado')
  })

  it('marcação ativa com série marcada, sem nenhuma válida → não realizado', () => {
    expect(
      estadoExercicioSessao({ series: [MARCADA], naoRealizado: true, seriesPlanejadas: 3 }),
    ).toBe<EstadoExercicioSessao>('nao_realizado')
  })
})

describe('estado inconsistente (FR-126)', () => {
  it('marcação ativa com série válida → inconsistente, nunca realizado nem não realizado', () => {
    const estado = estadoExercicioSessao({
      series: [VALIDA],
      naoRealizado: true,
      seriesPlanejadas: 3,
    })

    expect(estado).toBe<EstadoExercicioSessao>('inconsistente')
    expect(estado).not.toBe('realizado')
    expect(estado).not.toBe('nao_realizado')
    expect(estado).not.toBe('parcial')
  })

  it('vale também quando todas as planejadas estão válidas', () => {
    expect(
      estadoExercicioSessao({
        series: [VALIDA, VALIDA, VALIDA],
        naoRealizado: true,
        seriesPlanejadas: 3,
      }),
    ).toBe<EstadoExercicioSessao>('inconsistente')
  })

  it('é retorno, não exceção — o aplicativo precisa poder sinalizá-lo', () => {
    expect(() =>
      estadoExercicioSessao({ series: [VALIDA], naoRealizado: true, seriesPlanejadas: 1 }),
    ).not.toThrow()
  })

  it('tem texto próprio, para ser sinalizado ao usuário', () => {
    expect(textoDoEstado('inconsistente')).toMatch(/inconsistente/i)
  })

  it('não conta como execução finalizada para FR-043', () => {
    expect(contaComoExecucao('inconsistente')).toBe(false)
  })
})

describe('contribuição para FR-043 (FR-093)', () => {
  it.each([
    ['realizado', true],
    ['parcial', true],
    ['nao_realizado', false],
    ['nao_alcancado', false],
    ['inconsistente', false],
  ] as const)('%s conta como execução: %s', (estado, esperado) => {
    expect(contaComoExecucao(estado)).toBe(esperado)
  })
})

describe('determinismo (Princípio V)', () => {
  it('a mesma entrada produz o mesmo estado', () => {
    const entrada = { series: [VALIDA, SEM_REPETICOES], naoRealizado: false, seriesPlanejadas: 3 }
    expect(estadoExercicioSessao(entrada)).toBe(estadoExercicioSessao(entrada))
  })

  it('a ordem das séries na lista não altera o resultado', () => {
    const base = { naoRealizado: false, seriesPlanejadas: 3 }
    expect(estadoExercicioSessao({ ...base, series: [VALIDA, SEM_REPETICOES] })).toBe(
      estadoExercicioSessao({ ...base, series: [SEM_REPETICOES, VALIDA] }),
    )
  })

  it('todo estado tem texto', () => {
    const estados: EstadoExercicioSessao[] = [
      'realizado',
      'parcial',
      'nao_realizado',
      'nao_alcancado',
      'inconsistente',
    ]
    for (const estado of estados) expect(textoDoEstado(estado).length).toBeGreaterThan(0)
  })
})
