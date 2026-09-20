/**
 * Editor de séries planejadas — FR-008, FR-009.
 *
 * Cada série tem seus próprios valores. Uma linha por série, colunas alinhadas,
 * números tabulares: planejar 3x8 com cargas 40 / 42,5 / 45 precisa ser tão
 * fácil de ler quanto de digitar.
 */
import type { ValoresPlanejados } from '../../domain/treino'
import { validarSeriePlanejada } from '../../domain/treino'
import { Botao } from '../../ui/Botao'
import estilos from './treinos.module.css'

type Props = {
  series: readonly ValoresPlanejados[]
  aoMudar: (series: readonly ValoresPlanejados[]) => void
}

const SERIE_PADRAO: ValoresPlanejados = { repeticoes: 10, cargaKg: 0, rir: null }

export function EditorSeries({ series, aoMudar }: Props) {
  function alterar(indice: number, campo: keyof ValoresPlanejados, bruto: string) {
    const valor = bruto === '' ? null : Number(bruto)
    const proximas = series.map((serie, i) =>
      i === indice
        ? {
            ...serie,
            // `repeticoes` e `cargaKg` não aceitam nulo no modelo; um campo
            // esvaziado durante a digitação vira 0 e a validação o recusa.
            [campo]: campo === 'rir' ? valor : (valor ?? 0),
          }
        : serie,
    )
    aoMudar(proximas as readonly ValoresPlanejados[])
  }

  function acrescentar() {
    const ultima = series[series.length - 1] ?? SERIE_PADRAO
    aoMudar([...series, { ...ultima }])
  }

  function remover(indice: number) {
    aoMudar(series.filter((_, i) => i !== indice))
  }

  return (
    <>
      <div className={estilos.tabelaSeries}>
        <span className={estilos.cabecalhoColuna} aria-hidden="true" />
        <span className={estilos.cabecalhoColuna}>Repetições</span>
        <span className={estilos.cabecalhoColuna}>Carga (kg)</span>
        <span className={estilos.cabecalhoColuna}>RIR</span>
        <span className={estilos.cabecalhoColuna} aria-hidden="true" />

        {series.map((serie, indice) => {
          const problema = validarSeriePlanejada(serie)
          return (
            <FragmentoDeSerie
              key={indice}
              indice={indice}
              serie={serie}
              invalida={!problema.valido}
              aoAlterar={alterar}
              aoRemover={() => remover(indice)}
              podeRemover={series.length > 1}
            />
          )
        })}
      </div>

      <div className={estilos.acoesSeries}>
        <Botao variante="secundario" onClick={acrescentar}>
          Acrescentar série
        </Botao>
      </div>
    </>
  )
}

type PropsSerie = {
  indice: number
  serie: ValoresPlanejados
  invalida: boolean
  podeRemover: boolean
  aoAlterar: (indice: number, campo: keyof ValoresPlanejados, valor: string) => void
  aoRemover: () => void
}

function FragmentoDeSerie({
  indice,
  serie,
  invalida,
  podeRemover,
  aoAlterar,
  aoRemover,
}: PropsSerie) {
  const numero = indice + 1
  return (
    <>
      <span className={`${estilos.numeroSerie} numerico`} aria-hidden="true">
        {numero}
      </span>
      <input
        className={`${estilos.entradaSerie} numerico`}
        type="number"
        inputMode="numeric"
        min={1}
        step={1}
        value={serie.repeticoes}
        aria-label={`Repetições da série ${numero}`}
        aria-invalid={invalida || undefined}
        onChange={(evento) => aoAlterar(indice, 'repeticoes', evento.target.value)}
      />
      <input
        className={`${estilos.entradaSerie} numerico`}
        type="number"
        inputMode="decimal"
        min={0}
        step={0.5}
        value={serie.cargaKg}
        aria-label={`Carga da série ${numero} em quilos`}
        onChange={(evento) => aoAlterar(indice, 'cargaKg', evento.target.value)}
      />
      <input
        className={`${estilos.entradaSerie} numerico`}
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        value={serie.rir ?? ''}
        placeholder="—"
        aria-label={`RIR da série ${numero}, opcional`}
        onChange={(evento) => aoAlterar(indice, 'rir', evento.target.value)}
      />
      <button
        type="button"
        className={`${estilos.botaoIcone} ${estilos.botaoIconeSecundario}`}
        onClick={aoRemover}
        disabled={!podeRemover}
        aria-label={`Remover série ${numero}`}
      >
        ×
      </button>
    </>
  )
}
