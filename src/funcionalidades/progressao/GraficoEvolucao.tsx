/**
 * Curva de evolução de cargas — FR-049.
 *
 * SVG em linha, uma série só: a carga máxima por execução ao longo do tempo.
 * Série única, portanto **sem legenda** — o título nomeia o que está no gráfico.
 * Um único eixo de valor, como manda a regra: carga e volume têm escalas
 * diferentes e nunca dividem o mesmo gráfico.
 *
 * Rótulos diretos só no primeiro e no último ponto. Um número em cada ponto
 * transformaria a curva num amontoado de dígitos, e a tabela abaixo já dá o
 * valor exato de todos eles — ela é, ao mesmo tempo, a visão acessível e o
 * caminho para a sessão de cada ponto (US6, cenário 2).
 */
import {
  unidadeDoModo,
  valorDoPonto,
  type ModoDaEvolucao,
  type PontoDeEvolucao,
} from '../../domain/evolucao/agregar'
import { formatarCarga, formatarData } from '../../plataforma/formato'
import estilos from './progressao.module.css'

type Props = {
  pontos: readonly PontoDeEvolucao[]
  /** Carga ou repetições — num exercício sem carga, a curva mede reps (FR-146). */
  modo: ModoDaEvolucao
  nomeDoExercicio: string
}

const LARGURA = 320
const ALTURA = 160
const MARGEM = { topo: 18, direita: 16, baixo: 24, esquerda: 34 }

export function GraficoEvolucao({ pontos, modo, nomeDoExercicio }: Props) {
  if (pontos.length < 2) return null

  const unidade = unidadeDoModo(modo)
  const cargas = pontos.map((ponto) => valorDoPonto(ponto, modo))
  const minimo = Math.min(...cargas)
  const maximo = Math.max(...cargas)
  // Faixa mínima evita que uma carga constante vire uma linha colada no eixo.
  const faixa = Math.max(maximo - minimo, 2.5)
  const base = minimo - (faixa - (maximo - minimo)) / 2

  const areaLargura = LARGURA - MARGEM.esquerda - MARGEM.direita
  const areaAltura = ALTURA - MARGEM.topo - MARGEM.baixo

  const x = (indice: number) =>
    MARGEM.esquerda + (indice / (pontos.length - 1)) * areaLargura
  const y = (carga: number) =>
    MARGEM.topo + areaAltura - ((carga - base) / faixa) * areaAltura

  const caminho = pontos
    .map(
      (ponto, indice) =>
        `${indice === 0 ? 'M' : 'L'} ${x(indice)} ${y(valorDoPonto(ponto, modo))}`,
    )
    .join(' ')

  const primeiro = pontos[0]!
  const ultimo = pontos[pontos.length - 1]!

  return (
    <svg
      className={estilos.grafico}
      viewBox={`0 0 ${LARGURA} ${ALTURA}`}
      role="img"
      aria-label={`Evolução de ${nomeDoExercicio}: de ${formatarCarga(
        valorDoPonto(primeiro, modo),
      )} ${unidade} em ${formatarData(primeiro.quando)} a ${formatarCarga(
        valorDoPonto(ultimo, modo),
      )} ${unidade} em ${formatarData(ultimo.quando)}, em ${pontos.length} execuções.`}
    >
      {/* Eixo recessivo: uma régua de base, sem grade. */}
      <line
        className={estilos.eixo}
        x1={MARGEM.esquerda}
        y1={MARGEM.topo + areaAltura}
        x2={LARGURA - MARGEM.direita}
        y2={MARGEM.topo + areaAltura}
      />

      <text className={estilos.rotuloEixo} x={2} y={y(maximo) + 4}>
        {formatarCarga(maximo)}
      </text>
      <text className={estilos.rotuloEixo} x={2} y={y(minimo) + 4}>
        {formatarCarga(minimo)}
      </text>

      <path className={estilos.linhaCarga} d={caminho} />

      {pontos.map((ponto, indice) => (
        <circle
          key={ponto.sessaoId}
          className={estilos.pontoCarga}
          cx={x(indice)}
          cy={y(valorDoPonto(ponto, modo))}
          r={indice === 0 || indice === pontos.length - 1 ? 4.5 : 3.5}
        />
      ))}

      {/* Rótulo direto só nas pontas. */}
      <text
        className={estilos.rotuloEixo}
        x={x(pontos.length - 1)}
        y={y(valorDoPonto(ultimo, modo)) - 8}
        textAnchor="end"
      >
        {formatarCarga(valorDoPonto(ultimo, modo))} {unidade}
      </text>
    </svg>
  )
}
