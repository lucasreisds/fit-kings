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
    repeticoesMax: null,
    cargaKg: 40,
    rir,
  })) satisfies SeriePlanejadaParaAvaliar[]
}

/** Planejamento em faixa, como "3x 6-8" (FR-139). */
function faixa(quantidade: number, minimo: number, maximo: number, rir: number | null = null) {
  return Array.from({ length: quantidade }, (_, i) => ({
    ordem: i + 1,
    repeticoes: minimo,
    repeticoesMax: maximo,
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
        { ordem: 1, repeticoes: 10, repeticoesMax: null, cargaKg: 40, rir: null },
        { ordem: 2, repeticoes: 8, repeticoesMax: null, cargaKg: 42.5, rir: null },
        { ordem: 3, repeticoes: 6, repeticoesMax: null, cargaKg: 45, rir: null },
      ],
      realizadas: realizadas([11, 9, 7]),
    })
    expect(resultado.indica).toBe(true)

    // Uma que não superou a própria meta derruba o conjunto.
    expect(
      avaliarProgressao({
        planejadas: [
          { ordem: 1, repeticoes: 10, repeticoesMax: null, cargaKg: 40, rir: null },
          { ordem: 2, repeticoes: 8, repeticoesMax: null, cargaKg: 42.5, rir: null },
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

/**
 * T028 — SC-039, FR-142. Os casos de intervalo entram como **acréscimo**: os
 * dez de fronteira acima continuam rodando inalterados, e é isso que prova
 * SC-040. Se algum deles mudar de resultado, a generalização do intervalo
 * quebrou o que já funcionava.
 */
describe('faixa de repetições no critério (FR-160, SC-049, SC-050)', () => {
  /**
   * **A regra mudou aqui, e FR-142 foi substituído.**
   *
   * A versão anterior exigia **passar** do máximo da faixa. Na prática isso
   * esvaziava o recurso: quem segue uma prescrição de 6-8 não faz 9, então o
   * gatilho nunca disparava.
   *
   * No protocolo de dupla progressão, **atingir o teto é o gatilho**: sobe as
   * repetições até o topo da faixa, aumenta o peso, as repetições caem para a
   * base e o ciclo reinicia.
   */
  it('3x 6-8 com 8/8/8 indica — o teto da faixa foi alcançado', () => {
    const resultado = avaliarProgressao({
      planejadas: faixa(3, 6, 8),
      realizadas: realizadas([8, 8, 8]),
    })
    expect(resultado.indica).toBe(true)
    expect(resultado.motivo).toBe('dominou_a_faixa')
  })

  it('3x 6-8 com 9/9/9 também indica', () => {
    expect(
      avaliarProgressao({ planejadas: faixa(3, 6, 8), realizadas: realizadas([9, 9, 9]) }).indica,
    ).toBe(true)
  })

  it('3x 6-8 com 9/9/8 indica — todas alcançaram ao menos o teto', () => {
    expect(
      avaliarProgressao({ planejadas: faixa(3, 6, 8), realizadas: realizadas([9, 9, 8]) }).indica,
    ).toBe(true)
  })

  it('3x 6-8 com 8/8/7 não indica — uma série ficou abaixo do teto', () => {
    const resultado = avaliarProgressao({
      planejadas: faixa(3, 6, 8),
      realizadas: realizadas([8, 8, 7]),
    })
    expect(resultado.indica).toBe(false)
    expect(resultado.motivo).toBe('repeticoes_nao_superadas')
  })

  it('3x 6-8 com 7/7/7 não indica — ainda há faixa a percorrer', () => {
    expect(
      avaliarProgressao({ planejadas: faixa(3, 6, 8), realizadas: realizadas([7, 7, 7]) }).indica,
    ).toBe(false)
  })

  it('3x 6-8 com 5/5/5 não indica — abaixo da faixa', () => {
    expect(
      avaliarProgressao({ planejadas: faixa(3, 6, 8), realizadas: realizadas([5, 5, 5]) }).indica,
    ).toBe(false)
  })

  it('faixa de pontas iguais se comporta como valor único (FR-162)', () => {
    // 8-8 é a forma explícita do valor único: cumprir não é superar.
    expect(
      avaliarProgressao({ planejadas: faixa(3, 8, 8), realizadas: realizadas([8, 8, 8]) }).indica,
    ).toBe(false)
    expect(
      avaliarProgressao({ planejadas: faixa(3, 8, 8), realizadas: realizadas([9, 9, 9]) }).indica,
    ).toBe(true)

    // E produz o mesmo resultado que o valor único equivalente (FR-165).
    for (const reps of [
      [8, 8, 8],
      [9, 9, 9],
      [7, 7, 7],
    ]) {
      expect(
        avaliarProgressao({ planejadas: faixa(3, 8, 8), realizadas: realizadas(reps) }).indica,
      ).toBe(
        avaliarProgressao({ planejadas: planejadas(3, 8), realizadas: realizadas(reps) }).indica,
      )
    }
  })

  it('o detalhe expõe as duas pontas da faixa (FR-047)', () => {
    const resultado = avaliarProgressao({
      planejadas: faixa(3, 6, 8),
      realizadas: realizadas([8, 8, 8]),
    })
    expect(resultado.detalhePorSerie[0]).toMatchObject({
      repeticoesPlanejadas: 6,
      repeticoesMaximas: 8,
      repeticoesRealizadas: 8,
      superou: true,
    })
  })

  it('séries com faixas diferentes são avaliadas uma a uma (FR-009)', () => {
    const duasFaixas = [
      { ordem: 1, repeticoes: 8, repeticoesMax: 10, cargaKg: 40, rir: null },
      { ordem: 2, repeticoes: 6, repeticoesMax: 8, cargaKg: 42.5, rir: null },
    ]

    // Cada uma alcançou o próprio teto.
    expect(
      avaliarProgressao({ planejadas: duasFaixas, realizadas: realizadas([10, 8]) }).indica,
    ).toBe(true)

    // A primeira ficou aquém do teto dela.
    expect(
      avaliarProgressao({ planejadas: duasFaixas, realizadas: realizadas([9, 8]) }).indica,
    ).toBe(false)
  })

  it('o RIR continua se sobrepondo ao critério de repetições (FR-163)', () => {
    // Alcançar o teto com esforço maior não é dominar a faixa.
    const resultado = avaliarProgressao({
      planejadas: faixa(3, 6, 8, 2),
      realizadas: realizadas([8, 8, 8], { rir: [2, 2, 1] }),
    })
    expect(resultado.indica).toBe(false)
    expect(resultado.motivo).toBe('rir_abaixo_do_planejado')

    expect(
      avaliarProgressao({
        planejadas: faixa(3, 6, 8, 2),
        realizadas: realizadas([8, 8, 8], { rir: [2, 2, 2] }),
      }).indica,
    ).toBe(true)
  })

  it('série extra continua ignorada (FR-079)', () => {
    const resultado = avaliarProgressao({
      planejadas: faixa(3, 6, 8),
      realizadas: realizadas([8, 8, 8, 4]),
    })
    expect(resultado.indica).toBe(true)
    expect(resultado.detalhePorSerie).toHaveLength(3)
  })

  it('série planejada sem registro continua invalidando (FR-078)', () => {
    expect(
      avaliarProgressao({ planejadas: faixa(3, 6, 8), realizadas: realizadas([8, 8]) }).motivo,
    ).toBe('serie_sem_registro')
  })
})
