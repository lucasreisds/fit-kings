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
  /**
   * Recebe **como alterar**, não o resultado pronto.
   *
   * `series` vem do banco por `liveQuery` e fica um instante atrás da última
   * tecla. Montar o conjunto novo sobre ela faz a segunda alteração desfazer a
   * primeira: digitar "6" no mínimo e "8" no máximo em seguida gravava
   * `{ 10, 8 }`. A função é aplicada sobre o que está gravado, dentro da
   * transação — igual ao `setState` com função do React, e pela mesma razão.
   */
  aoMudar: (
    transformar: (atuais: readonly ValoresPlanejados[]) => readonly ValoresPlanejados[],
  ) => void
}

const SERIE_PADRAO: ValoresPlanejados = {
  repeticoes: 10,
  repeticoesMax: null,
  cargaKg: 0,
  rir: null,
}

export function EditorSeries({ series, aoMudar }: Props) {
  function alterar(indice: number, campo: keyof ValoresPlanejados, bruto: string) {
    const valor = bruto === '' ? null : Number(bruto)
    // `rir` e `repeticoesMax` aceitam nulo; `repeticoes` e `cargaKg` não, e um
    // campo esvaziado durante a digitação vira 0, que a validação recusa.
    const aceitaNulo = campo === 'rir' || campo === 'repeticoesMax'

    aoMudar(
      (atuais) =>
        atuais.map((serie, i) =>
          i === indice ? { ...serie, [campo]: aceitaNulo ? valor : (valor ?? 0) } : serie,
        ) as readonly ValoresPlanejados[],
    )
  }

  function acrescentar() {
    aoMudar((atuais) => [...atuais, { ...(atuais[atuais.length - 1] ?? SERIE_PADRAO) }])
  }

  function remover(indice: number) {
    aoMudar((atuais) => atuais.filter((_, i) => i !== indice))
  }

  return (
    <>
      <div className={estilos.tabelaSeries}>
        <span className={estilos.cabecalhoColuna} aria-hidden="true" />
        <span className={estilos.cabecalhoColuna}>Repetições</span>
        <span className={estilos.cabecalhoColuna}>até</span>
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
      {/*
        FR-139 — o máximo do intervalo. Deixá-lo vazio mantém o valor único, que
        é como o campo se comportava antes desta feature: quem não usa intervalo
        não precisa saber que ele existe.
      */}
      <input
        className={`${estilos.entradaSerie} numerico`}
        type="number"
        inputMode="numeric"
        min={1}
        step={1}
        value={serie.repeticoesMax ?? ''}
        placeholder="—"
        aria-label={`Máximo de repetições da série ${numero}, opcional`}
        aria-invalid={invalida || undefined}
        onChange={(evento) => aoAlterar(indice, 'repeticoesMax', evento.target.value)}
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
