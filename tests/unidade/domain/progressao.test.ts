import { describe, expect, it } from 'vitest'
import {
  avaliarProgressao,
  textoDoMotivo,
  type EntradaDaAvaliacao,
  type SeriePlanejadaParaAvaliar,
  type SerieRealizadaParaAvaliar,
} from '../../../src/domain/progressao/avaliar'

/**
 * **Portão 4 da constituição** — determinismo do critério de aumento de carga.
 *
 * Os dez casos de fronteira de quickstart.md, na mesma ordem em que estão lá.
 * Executado em Vitest, sem interface, como o portão exige.
 *
 * Cobre FR-043, FR-044, FR-078 a FR-081, FR-092 a FR-094, SC-006, SC-007 e
 * SC-021.
 */

function planejadas(quantidade: number, repeticoes = 8, rir: number | null = null) {
  return Array.from({ length: quantidade }, (_, i) => ({
    ordem: i + 1,
    repeticoes,
    cargaKg: 40,
    rir,
  })) satisfies SeriePlanejadaParaAvaliar[]
}

function realizadas(
  repeticoes: readonly (number | null)[],
  opcoes: { rir?: readonly (number | null)[]; naoRealizadas?: readonly number[] } = {},
): SerieRealizadaParaAvaliar[] {
  return repeticoes.map((reps, i) => ({
    ordem: i + 1,
    repeticoes: reps,
    rir: opcoes.rir?.[i] ?? null,
    naoRealizada: opcoes.naoRealizadas?.includes(i + 1) ?? false,
  }))
}

describe('Portão 4 — os dez casos de fronteira de quickstart.md', () => {
  it('1. planejado 3×8, realizado 9/9/9 → indica aumento', () => {
    const resultado = avaliarProgressao({
      planejadas: planejadas(3),
      realizadas: realizadas([9, 9, 9]),
    })
    expect(resultado.indica).toBe(true)
    expect(resultado.motivo).toBe('superou_em_todas')
  })

  it('2. planejado 3×8, realizado 8/8/8 → não indica (FR-081)', () => {
    // Empate não é superação. A comparação é estritamente maior.
    const resultado = avaliarProgressao({
      planejadas: planejadas(3),
      realizadas: realizadas([8, 8, 8]),
    })
    expect(resultado.indica).toBe(false)
    expect(resultado.motivo).toBe('repeticoes_nao_superadas')
  })

  it('3. planejado 3×8, realizado 10/8/6 → não indica, nem todas superaram', () => {
    const resultado = avaliarProgressao({
      planejadas: planejadas(3),
      realizadas: realizadas([10, 8, 6]),
    })
    expect(resultado.indica).toBe(false)
    // A primeira superou; o resultado global não.
    expect(resultado.detalhePorSerie[0]!.superou).toBe(true)
    expect(resultado.detalhePorSerie[1]!.superou).toBe(false)
  })

  it('4. uma série planejada sem registro → não indica (FR-078)', () => {
    const resultado = avaliarProgressao({
      planejadas: planejadas(3),
      realizadas: realizadas([9, 9]),
    })
    expect(resultado.indica).toBe(false)
    expect(resultado.motivo).toBe('serie_sem_registro')
  })

  it('5. série extra além das planejadas → ignorada na avaliação (FR-079)', () => {
    // A quarta série não entra na conta: ela não tem meta para superar.
    const comExtra = avaliarProgressao({
      planejadas: planejadas(3),
      realizadas: realizadas([9, 9, 9, 5]),
    })
    const semExtra = avaliarProgressao({
      planejadas: planejadas(3),
      realizadas: realizadas([9, 9, 9]),
    })

    expect(comExtra.indica).toBe(true)
    expect(comExtra.detalhePorSerie).toHaveLength(3)
    expect(comExtra.indica).toBe(semExtra.indica)
  })

  it('6. RIR não informado em nenhuma série → aplica só repetições (FR-044)', () => {
    const resultado = avaliarProgressao({
      planejadas: planejadas(3, 8, 2),
      realizadas: realizadas([9, 9, 9]),
    })
    expect(resultado.indica).toBe(true)
    expect(resultado.rirConsiderado).toBe(false)
  })

  it('7. RIR realizado abaixo do planejado → não indica', () => {
    const resultado = avaliarProgressao({
      planejadas: planejadas(3, 8, 2),
      realizadas: realizadas([9, 9, 9], { rir: [2, 2, 1] }),
    })
    expect(resultado.indica).toBe(false)
    expect(resultado.motivo).toBe('rir_abaixo_do_planejado')
    expect(resultado.rirConsiderado).toBe(true)
  })

  it('8. exercício sem execução anterior → não indica (FR-048)', () => {
    const resultado = avaliarProgressao({ planejadas: planejadas(3), realizadas: [] })
    expect(resultado.indica).toBe(false)
    expect(resultado.motivo).toBe('sem_execucao')
  })

  it('9. exercício planejado totalmente pulado → não conta como execução (FR-093)', () => {
    const resultado = avaliarProgressao({
      planejadas: planejadas(3),
      realizadas: realizadas([null, null, null], { naoRealizadas: [1, 2, 3] }),
    })
    expect(resultado.indica).toBe(false)
    // Não é "não superou": é "não houve execução". A distinção importa, porque
    // uma indicação anterior permanece válida neste caso (FR-093, SC-024).
    expect(resultado.motivo).toBe('sem_execucao')
  })

  it('10. exercício adicionado fora do plano → não indica naquela sessão (FR-089)', () => {
    const resultado = avaliarProgressao({
      planejadas: [],
      realizadas: realizadas([12, 12, 12]),
    })
    expect(resultado.indica).toBe(false)
    expect(resultado.motivo).toBe('sem_plano')
  })
})

describe('critério de RIR (FR-044)', () => {
  it('RIR realizado maior que o planejado indica — sobrou mais reserva', () => {
    const resultado = avaliarProgressao({
      planejadas: planejadas(3, 8, 1),
      realizadas: realizadas([9, 9, 9], { rir: [2, 2, 2] }),
    })
    expect(resultado.indica).toBe(true)
  })

  it('RIR realizado igual ao planejado indica', () => {
    const resultado = avaliarProgressao({
      planejadas: planejadas(3, 8, 2),
      realizadas: realizadas([9, 9, 9], { rir: [2, 2, 2] }),
    })
    expect(resultado.indica).toBe(true)
  })

  it('o RIR só é critério nas séries em que os dois foram informados', () => {
    // Planejado com RIR, realizado sem: aquela série não aplica o critério.
    const resultado = avaliarProgressao({
      planejadas: planejadas(3, 8, 2),
      realizadas: realizadas([9, 9, 9], { rir: [2, null, 2] }),
    })
    expect(resultado.indica).toBe(true)
    expect(resultado.rirConsiderado).toBe(true)
  })

  it('RIR planejado nulo não invalida, mesmo com realizado informado', () => {
    const resultado = avaliarProgressao({
      planejadas: planejadas(3, 8, null),
      realizadas: realizadas([9, 9, 9], { rir: [0, 0, 0] }),
    })
    expect(resultado.indica).toBe(true)
    expect(resultado.rirConsiderado).toBe(false)
  })
})

describe('exclusões do critério (FR-078, FR-079, FR-081)', () => {
  it('série planejada marcada como não realizada invalida', () => {
    const resultado = avaliarProgressao({
      planejadas: planejadas(3),
      realizadas: realizadas([9, 9, 9], { naoRealizadas: [2] }),
    })
    expect(resultado.indica).toBe(false)
    expect(resultado.motivo).toBe('serie_nao_realizada')
  })

  it('série com repetições nulas invalida, mesmo sem marcação', () => {
    const resultado = avaliarProgressao({
      planejadas: planejadas(3),
      realizadas: realizadas([9, null, 9]),
    })
    expect(resultado.indica).toBe(false)
    expect(resultado.motivo).toBe('serie_sem_registro')
  })

  it('uma única série planejada, superada, indica', () => {
    const resultado = avaliarProgressao({
      planejadas: planejadas(1),
      realizadas: realizadas([9]),
    })
    expect(resultado.indica).toBe(true)
  })

  it('metas diferentes entre séries são comparadas uma a uma (FR-009)', () => {
    const resultado = avaliarProgressao({
      planejadas: [
        { ordem: 1, repeticoes: 10, cargaKg: 40, rir: null },
        { ordem: 2, repeticoes: 8, cargaKg: 42.5, rir: null },
        { ordem: 3, repeticoes: 6, cargaKg: 45, rir: null },
      ],
      realizadas: realizadas([11, 9, 7]),
    })
    expect(resultado.indica).toBe(true)

    // Uma que não superou a própria meta derruba o conjunto.
    expect(
      avaliarProgressao({
        planejadas: [
          { ordem: 1, repeticoes: 10, cargaKg: 40, rir: null },
          { ordem: 2, repeticoes: 8, cargaKg: 42.5, rir: null },
        ],
        realizadas: realizadas([11, 8]),
      }).indica,
    ).toBe(false)
  })
})

describe('determinismo (Princípio V)', () => {
  const entrada: EntradaDaAvaliacao = {
    planejadas: planejadas(3, 8, 2),
    realizadas: realizadas([9, 9, 9], { rir: [2, 2, 2] }),
  }

  it('mesma entrada, mesmo resultado, sempre', () => {
    expect(avaliarProgressao(entrada)).toEqual(avaliarProgressao(entrada))
  })

  it('a ordem das séries na lista não altera o resultado', () => {
    const invertida: EntradaDaAvaliacao = {
      planejadas: [...entrada.planejadas].reverse(),
      realizadas: [...entrada.realizadas].reverse(),
    }
    expect(avaliarProgressao(invertida).indica).toBe(avaliarProgressao(entrada).indica)
  })

  it('não altera as entradas recebidas', () => {
    const copia = structuredClone(entrada)
    avaliarProgressao(entrada)
    expect(entrada).toEqual(copia)
  })

  it('todo motivo tem texto consultável pelo usuário (Princípio V, FR-047)', () => {
    const motivos = [
      'superou_em_todas',
      'sem_plano',
      'sem_execucao',
      'serie_sem_registro',
      'serie_nao_realizada',
      'repeticoes_nao_superadas',
      'rir_abaixo_do_planejado',
    ] as const
    for (const motivo of motivos) expect(textoDoMotivo(motivo).length).toBeGreaterThan(0)
  })

  it('o detalhe fundamenta a indicação, série a série (FR-047)', () => {
    const resultado = avaliarProgressao(entrada)
    expect(resultado.detalhePorSerie).toHaveLength(3)
    expect(resultado.detalhePorSerie[0]).toMatchObject({
      ordem: 1,
      repeticoesPlanejadas: 8,
      repeticoesRealizadas: 9,
      rirPlanejado: 2,
      rirRealizado: 2,
      superou: true,
    })
  })
})
