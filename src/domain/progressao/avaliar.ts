/**
 * Critério de aumento de carga — FR-043, FR-044, FR-078 a FR-081, FR-089,
 * FR-092 a FR-094, Princípio V.
 *
 * Este é o diferencial do produto, e por isso é a regra mais protegida do
 * projeto: função pura, um único lugar, resultado nunca persistido. Um aviso de
 * progressão que varia sem explicação é pior do que nenhum aviso.
 *
 * **O critério**, exatamente:
 *
 * 1. As repetições realizadas superam **o máximo do intervalo planejado** em
 *    todas as séries planejadas — estritamente maiores, empate não conta
 *    (FR-043, FR-081, FR-142).
 *
 *    Para uma série de valor único o máximo é o próprio valor, e a regra é
 *    literalmente a que sempre foi. É o que faz os dez casos de fronteira do
 *    portão 4 continuarem valendo sem alteração (SC-040).
 * 2. **E** o RIR realizado é maior ou igual ao planejado nas séries em que os
 *    dois foram informados (FR-044). Se o RIR não foi informado em nenhuma
 *    série, aplica-se só o critério de repetições.
 *
 * **O que invalida**:
 *
 * - série planejada sem registro, ou marcada como não realizada (FR-078);
 * - série extra além das planejadas — ela é **ignorada**, não avaliada (FR-079);
 * - exercício sem execução anterior (FR-048);
 * - exercício adicionado fora do plano, que não tem meta (FR-089).
 */
import type { Planejado } from '../serie/validade'
import { serieEhValida, type SerieAvaliavel } from '../serie/validade'
import { intervaloDe, superouIntervalo } from '../serie/intervalo'

export type SerieRealizadaParaAvaliar = SerieAvaliavel & {
  readonly ordem: number
  readonly rir: number | null
}

export type SeriePlanejadaParaAvaliar = Planejado & {
  readonly ordem: number
}

export type EntradaDaAvaliacao = {
  readonly planejadas: readonly SeriePlanejadaParaAvaliar[]
  readonly realizadas: readonly SerieRealizadaParaAvaliar[]
}

export type MotivoDaAvaliacao =
  | 'superou_em_todas'
  /** Faixa dominada: o teto foi alcançado em todas as séries (FR-160). */
  | 'dominou_a_faixa'
  | 'sem_plano'
  | 'sem_execucao'
  | 'serie_sem_registro'
  | 'serie_nao_realizada'
  | 'repeticoes_nao_superadas'
  | 'rir_abaixo_do_planejado'

export type AvaliacaoDeProgressao = {
  /** Indica aumento de carga? */
  readonly indica: boolean
  readonly motivo: MotivoDaAvaliacao
  /** Séries planejadas que foram superadas, para fundamentar o aviso (FR-047). */
  readonly detalhePorSerie: readonly DetalheDaSerie[]
  /** O critério de RIR foi aplicado? Falso quando nenhum RIR foi informado. */
  readonly rirConsiderado: boolean
}

export type DetalheDaSerie = {
  readonly ordem: number
  /** Mínimo do intervalo. Mantém o nome por compatibilidade de leitura. */
  readonly repeticoesPlanejadas: number
  /** Máximo do intervalo. Igual ao mínimo quando a ponta é única. */
  readonly repeticoesMaximas: number
  readonly repeticoesRealizadas: number | null
  readonly rirPlanejado: number | null
  readonly rirRealizado: number | null
  readonly superou: boolean
}

export function avaliarProgressao(entrada: EntradaDaAvaliacao): AvaliacaoDeProgressao {
  // FR-089: exercício sem plano não tem meta de comparação. Nunca indica.
  if (entrada.planejadas.length === 0) {
    return { indica: false, motivo: 'sem_plano', detalhePorSerie: [], rirConsiderado: false }
  }

  // FR-048, FR-093: sem nenhuma série válida não houve execução para avaliar.
  if (!entrada.realizadas.some(serieEhValida)) {
    return { indica: false, motivo: 'sem_execucao', detalhePorSerie: [], rirConsiderado: false }
  }

  const porOrdem = new Map(entrada.realizadas.map((serie) => [serie.ordem, serie]))
  const detalhePorSerie: DetalheDaSerie[] = []

  let indica = true
  let rirConsiderado = false
  // Numa faixa, o passo seguinte do usuário é outro — subir o peso e ver as
  // repetições caírem para a base. Dizer "você superou" onde ele cumpriu
  // exatamente o planejado seria impreciso (D3).
  const haFaixa = entrada.planejadas.some(
    (planejada) => (planejada.repeticoesMax ?? planejada.repeticoes) > planejada.repeticoes,
  )
  let motivo: MotivoDaAvaliacao = haFaixa ? 'dominou_a_faixa' : 'superou_em_todas'

  // Percorre **as planejadas**. A série extra fica de fora do laço por
  // construção — é o que FR-079 quer dizer com "ignorada".
  for (const planejada of entrada.planejadas) {
    const realizada = porOrdem.get(planejada.ordem)

    const intervalo = intervaloDe({
      repeticoes: planejada.repeticoes,
      repeticoesMax: planejada.repeticoesMax ?? null,
    })

    const detalhe: DetalheDaSerie = {
      ordem: planejada.ordem,
      repeticoesPlanejadas: intervalo.minimo,
      repeticoesMaximas: intervalo.maximo,
      repeticoesRealizadas: realizada?.repeticoes ?? null,
      rirPlanejado: planejada.rir,
      rirRealizado: realizada?.rir ?? null,
      superou: false,
    }

    // FR-078: planejada sem registro invalida.
    if (!realizada || realizada.repeticoes === null) {
      detalhePorSerie.push(detalhe)
      if (indica) {
        indica = false
        motivo = 'serie_sem_registro'
      }
      continue
    }

    // FR-078: marcada como não realizada invalida.
    if (!serieEhValida(realizada)) {
      detalhePorSerie.push(detalhe)
      if (indica) {
        indica = false
        motivo = 'serie_nao_realizada'
      }
      continue
    }

    // FR-142: estritamente maior que o **máximo** do intervalo. Ficar no topo
    // é cumprir a meta, não superá-la. Com ponta única, é FR-043 sem mudança.
    const superouRepeticoes = superouIntervalo(realizada.repeticoes, intervalo)

    // FR-044: o RIR só é critério nas séries em que os dois foram informados.
    let rirOk = true
    if (planejada.rir !== null && realizada.rir !== null) {
      rirConsiderado = true
      rirOk = realizada.rir >= planejada.rir
    }

    detalhePorSerie.push({ ...detalhe, superou: superouRepeticoes && rirOk })

    if (indica && !superouRepeticoes) {
      indica = false
      motivo = 'repeticoes_nao_superadas'
    } else if (indica && !rirOk) {
      indica = false
      motivo = 'rir_abaixo_do_planejado'
    }
  }

  return { indica, motivo, detalhePorSerie, rirConsiderado }
}

const TEXTOS: Record<MotivoDaAvaliacao, string> = {
  superou_em_todas: 'Você superou a meta em todas as séries. Dá para subir a carga.',
  dominou_a_faixa:
    'Você alcançou o topo da faixa em todas as séries. Suba a carga — as repetições vão cair para a base da faixa, e o ciclo recomeça.',
  sem_plano: 'Este exercício entrou fora do plano, então não há meta para comparar.',
  sem_execucao: 'Ainda não há uma execução registrada deste exercício para comparar.',
  serie_sem_registro: 'Uma das séries planejadas ficou sem registro.',
  serie_nao_realizada: 'Uma das séries planejadas foi marcada como não realizada.',
  repeticoes_nao_superadas: 'As repetições não alcançaram a meta em todas as séries.',
  rir_abaixo_do_planejado: 'O RIR ficou abaixo do planejado em alguma série.',
}

export function textoDoMotivo(motivo: MotivoDaAvaliacao): string {
  return TEXTOS[motivo]
}
