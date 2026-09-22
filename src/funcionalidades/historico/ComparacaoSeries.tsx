/**
 * Grade planejado x realizado — FR-037, FR-038, FR-020.
 *
 * Os dois valores aparecem lado a lado, em colunas alinhadas com figuras
 * tabulares. A comparação leva **marca e palavra**, não só cor: em preto e
 * branco, ou para quem não distingue as cores, a informação continua inteira.
 */
import type { SerieRealizada } from '../../domain/tipos'
import { compararSerie } from '../../domain/serie/validade'
import { formatarIntervalo, intervaloDe } from '../../domain/serie/intervalo'
import type { MetaDaSerie } from '../execucao/iniciarSessao'
import { formatarCarga } from '../../plataforma/formato'
import estilos from './historico.module.css'

type Props = {
  series: readonly SerieRealizada[]
  metas: readonly MetaDaSerie[]
}

export function ComparacaoSeries({ series, metas }: Props) {
  if (series.length === 0) {
    return <span className={estilos.naoRealizada}>Nenhuma série registrada.</span>
  }

  return (
    <div className={estilos.grade}>
      <span className={estilos.cabecalhoGrade} aria-hidden="true" />
      <span className={estilos.cabecalhoGrade}>Planejado</span>
      <span className={estilos.cabecalhoGrade}>Realizado</span>
      <span className={estilos.cabecalhoGrade} aria-hidden="true" />

      {series.map((serie) => {
        const meta = metas[serie.ordem - 1]
        const comparacao = compararSerie(
          meta
            ? {
                repeticoes: meta.repeticoes,
                repeticoesMax: meta.repeticoesMax,
                cargaKg: meta.cargaKg,
                rir: meta.rir,
              }
            : null,
          serie,
        )

        return (
          <div key={serie.id} style={{ display: 'contents' }}>
            <span className={`${estilos.ordem} numerico`}>{serie.ordem}</span>

            <span className={`${estilos.planejado} numerico`}>
              {meta
                ? `${formatarIntervalo(intervaloDe(meta))} × ${formatarCarga(meta.cargaKg)} kg${
                    meta.rir !== null ? `, RIR ${meta.rir}` : ''
                  }`
                : 'série extra'}
            </span>

            {serie.naoRealizada ? (
              <span className={estilos.naoRealizada}>não realizada</span>
            ) : (
              <span className={`${estilos.realizado} numerico`}>
                {serie.repeticoes ?? '—'} × {formatarCarga(serie.cargaKg)} kg
                {serie.rir !== null ? `, RIR ${serie.rir}` : ''}
              </span>
            )}

            <span className={classeDaMarca(comparacao.repeticoes)}>
              {textoDaMarca(comparacao.repeticoes)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

type Marca = ReturnType<typeof compararSerie>['repeticoes']

function classeDaMarca(comparacao: Marca): string {
  if (comparacao === 'acima') return estilos.marcaAcima!
  if (comparacao === 'abaixo') return estilos.marcaAbaixo!
  return estilos.marcaIgual!
}

function textoDaMarca(comparacao: Marca): string {
  switch (comparacao) {
    case 'acima':
      return '▲ acima'
    case 'abaixo':
      return '▼ abaixo'
    case 'igual':
      return '= na meta'
    default:
      return ''
  }
}
